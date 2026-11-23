-- Daily AI usage quotas (docs/ARCHITECTURE.md §6.8).
--
-- Every request that calls Sarvam (new question node, trap attempt, voice ask)
-- consumes one unit before the call. Two counters per India-time day:
--   * per user and kind  -> stops one person burning the budget
--   * global, all kinds  -> hard daily cost ceiling for the whole service
-- Only the API (service_role) can touch these; there is no client access.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_day date not null,
  kind text not null check (kind in ('question', 'trap', 'voice')),
  used integer not null default 0 check (used >= 0),
  primary key (user_id, usage_day, kind)
);

create table if not exists public.ai_usage_global (
  usage_day date primary key,
  used integer not null default 0 check (used >= 0)
);

alter table public.ai_usage enable row level security;
alter table public.ai_usage_global enable row level security;
-- No policies: anon/authenticated get nothing. service_role bypasses RLS.
revoke all on public.ai_usage, public.ai_usage_global from public, anon, authenticated;

-- Consumes one unit. Returns {allowed, reason, used, limit}. reason is null when
-- allowed, otherwise 'service_at_capacity' or 'daily_quota_exceeded'. Each
-- counter only increments while below its limit, so concurrent calls never
-- push a counter past it.
create or replace function public.consume_ai_quota(
  p_user_id uuid,
  p_kind text,
  p_user_limit integer,
  p_global_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_day date := (now() at time zone 'Asia/Kolkata')::date;
  v_global integer;
  v_used integer;
begin
  insert into public.ai_usage_global as g (usage_day, used)
  values (v_day, 1)
  on conflict (usage_day) do update set used = g.used + 1
    where g.used < p_global_limit
  returning used into v_global;

  if v_global is null then
    return jsonb_build_object('allowed', false, 'reason', 'service_at_capacity', 'used', null, 'limit', p_user_limit);
  end if;

  insert into public.ai_usage as u (user_id, usage_day, kind, used)
  values (p_user_id, v_day, p_kind, 1)
  on conflict (user_id, usage_day, kind) do update set used = u.used + 1
    where u.used < p_user_limit
  returning used into v_used;

  if v_used is null then
    update public.ai_usage_global set used = used - 1 where usage_day = v_day and used > 0;
    return jsonb_build_object('allowed', false, 'reason', 'daily_quota_exceeded', 'used', p_user_limit, 'limit', p_user_limit);
  end if;

  return jsonb_build_object('allowed', true, 'reason', null, 'used', v_used, 'limit', p_user_limit);
end;
$$;

-- Gives back one unit when the AI call failed, so errors don't eat a user's quota.
create or replace function public.refund_ai_quota(p_user_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_day date := (now() at time zone 'Asia/Kolkata')::date;
begin
  update public.ai_usage set used = used - 1
    where user_id = p_user_id and usage_day = v_day and kind = p_kind and used > 0;
  update public.ai_usage_global set used = used - 1 where usage_day = v_day and used > 0;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer, integer) to service_role;
revoke all on function public.refund_ai_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.refund_ai_quota(uuid, text) to service_role;
