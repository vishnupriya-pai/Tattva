-- =========================================================================
-- 20261117120000_socratic_crucible_schema.sql
-- Tattva Milestone 1: Socratic Inversion, Contrastive Traps & Proof-of-Struggle Ledger
-- =========================================================================

-- 1. Alter question_nodes with Socratic Crucible fields
alter table public.question_nodes
  add column if not exists learner_hypothesis text,
  add column if not exists hypothesis_submitted_at timestamptz,
  add column if not exists time_to_formulation_ms integer check (time_to_formulation_ms is null or time_to_formulation_ms >= 0),
  add column if not exists mastery_status text not null default 'tentative' check (mastery_status in ('tentative', 'challenged', 'conquered')),
  add column if not exists contrastive_options jsonb,
  add column if not exists code_challenge jsonb;

create index if not exists question_nodes_mastery_status_idx on public.question_nodes (mastery_status);

-- 2. Alter wallet_transactions with Proof-of-Struggle signature and metadata
alter table public.wallet_transactions
  add column if not exists proof_of_struggle_metadata jsonb not null default '{}'::jsonb,
  add column if not exists transaction_signature text;

-- 3. Upgrade create_question_node function to support Socratic attributes
create or replace function public.create_question_node(
  p_user_id uuid,
  p_inquiry_id uuid,
  p_parent_node_id uuid,
  p_selected_follow_up_id uuid,
  p_user_question text,
  p_ai_explanation text,
  p_research_mode boolean,
  p_is_trap boolean,
  p_trap_metadata jsonb,
  p_follow_ups jsonb,
  p_learner_hypothesis text default null,
  p_time_to_formulation_ms integer default null,
  p_mastery_status text default null,
  p_contrastive_options jsonb default null,
  p_code_challenge jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_node_id uuid;
  selected_follow_up public.follow_up_questions%rowtype;
  initial_status text;
begin
  if not exists (select 1 from public.inquiries i where i.id = p_inquiry_id and i.user_id = p_user_id) then
    raise exception 'inquiry_not_found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_follow_ups) <> 'array' or jsonb_array_length(p_follow_ups) <> 3 then
    raise exception 'exactly_three_followups_required' using errcode = '22023';
  end if;

  if p_parent_node_id is not null then
    if not exists (
      select 1 from public.question_nodes p
      where p.id = p_parent_node_id and p.inquiry_id = p_inquiry_id and (not p.is_trap or p.trap_resolved_at is not null)
    ) then
      raise exception 'parent_missing_or_trap_unresolved' using errcode = '23514';
    end if;
  end if;

  if p_selected_follow_up_id is not null then
    select * into selected_follow_up from public.follow_up_questions where id = p_selected_follow_up_id for update;
    if not found or selected_follow_up.question_node_id <> p_parent_node_id or selected_follow_up.is_selected or selected_follow_up.child_node_id is not null then
      raise exception 'followup_unavailable' using errcode = '23505';
    end if;
    if selected_follow_up.question_text <> p_user_question then
      raise exception 'question_must_match_selected_followup' using errcode = '22023';
    end if;
  end if;

  -- Determine initial status: if trap, status is 'challenged'; else caller default or 'tentative'
  initial_status := coalesce(p_mastery_status, case when p_is_trap then 'challenged' else 'tentative' end);

  insert into public.question_nodes(
    inquiry_id,
    parent_node_id,
    user_question,
    ai_explanation,
    research_mode,
    is_trap,
    trap_metadata,
    learner_hypothesis,
    hypothesis_submitted_at,
    time_to_formulation_ms,
    mastery_status,
    contrastive_options,
    code_challenge
  )
  values (
    p_inquiry_id,
    p_parent_node_id,
    p_user_question,
    p_ai_explanation,
    p_research_mode,
    p_is_trap,
    p_trap_metadata,
    p_learner_hypothesis,
    case when p_learner_hypothesis is not null then now() else null end,
    p_time_to_formulation_ms,
    initial_status,
    p_contrastive_options,
    p_code_challenge
  )
  returning id into new_node_id;

  insert into public.follow_up_questions(question_node_id, position, question_text)
  select new_node_id, ordinality::smallint, value
  from jsonb_array_elements_text(p_follow_ups) with ordinality;

  if p_selected_follow_up_id is not null then
    update public.follow_up_questions
    set is_selected = true, child_node_id = new_node_id
    where id = p_selected_follow_up_id;
  end if;

  return new_node_id;
end;
$$;

revoke all on function public.create_question_node(uuid, uuid, uuid, uuid, text, text, boolean, boolean, jsonb, jsonb, text, integer, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_question_node(uuid, uuid, uuid, uuid, text, text, boolean, boolean, jsonb, jsonb, text, integer, text, jsonb, jsonb) to service_role;

-- 4. Upgrade resolve_trap to set mastery_status to 'conquered'
create or replace function public.resolve_trap(p_user_id uuid, p_node_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resolved_at timestamptz;
begin
  if not exists (
    select 1 from public.question_nodes n join public.inquiries i on i.id = n.inquiry_id
    where n.id = p_node_id and i.user_id = p_user_id and n.is_trap and n.trap_resolved_at is null
  ) then
    raise exception 'trap_unavailable' using errcode = 'P0002';
  end if;

  update public.question_nodes
  set trap_resolved_at = now(),
      mastery_status = 'conquered'
  where id = p_node_id and is_trap and trap_resolved_at is null
  returning trap_resolved_at into resolved_at;

  if resolved_at is null then
    raise exception 'trap_unavailable' using errcode = 'P0002';
  end if;

  return resolved_at;
end;
$$;

revoke all on function public.resolve_trap(uuid, uuid) from public, anon, authenticated;
grant execute on function public.resolve_trap(uuid, uuid) to service_role;
