-- Add the atomic write operations needed by the interactive Golden Path.
-- This is separate from the initial schema so already-migrated projects can
-- upgrade without replaying the original migration.

alter table public.learning_sources add column if not exists content text not null default '';
insert into public.learning_sources (id, title, description, source_type, duration_minutes, source_reference, content)
values (
  '11111111-1111-4111-8111-111111111111',
  'Memory Arena Allocators: Design and Trade-offs',
  'A dense walkthrough of arena/bump allocators, free-list strategies, and the fragmentation trade-offs systems engineers accept when they trade general-purpose malloc for a custom allocator.',
  'transcript', 38, 'seed/memory-arena-allocators.txt',
  $content$Arena allocation trades flexibility for throughput. Instead of tracking individual block metadata the way a general-purpose allocator does, an arena allocator reserves one contiguous region up front and satisfies allocations by advancing a single bump pointer. Freeing is batched: the whole arena is reset or released at once, never per-object.

This works well when object lifetimes are correlated — a request handler, a single frame of a game loop, a parser pass over one file. It works badly when lifetimes are independent, because there is no way to reclaim an individual object's memory without invalidating every allocation made after it in the same arena.

A free-list allocator reintroduces per-object reclamation by threading freed blocks into a linked list keyed by size class, at the cost of metadata overhead and fragmentation as blocks of mismatched sizes accumulate. Hybrid designs use arenas for short-lived, correlated allocations and fall back to a general-purpose allocator or a size-class free list for everything else.

The failure mode to watch for: holding a pointer into an arena past the arena's reset point. Because the arena's bump pointer is just rewound, the memory is not zeroed or protected — a stale pointer silently aliases whatever is allocated next, producing memory-safety bugs that are very difficult to reproduce.$content$
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  source_type = excluded.source_type,
  duration_minutes = excluded.duration_minutes,
  source_reference = excluded.source_reference,
  content = excluded.content;

drop policy if exists question_nodes_update_trap_own on public.question_nodes;
revoke insert, update, delete on public.question_nodes from authenticated;

drop policy if exists follow_up_questions_update_own on public.follow_up_questions;
revoke insert, update, delete on public.follow_up_questions from authenticated;
revoke insert, update, delete on public.question_nodes from anon;
revoke insert, update, delete on public.follow_up_questions from anon;

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
  p_follow_ups jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_node_id uuid;
  selected_follow_up public.follow_up_questions%rowtype;
begin
  if not exists (select 1 from public.inquiries i where i.id = p_inquiry_id and i.user_id = p_user_id) then
    raise exception 'inquiry_not_found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_follow_ups) <> 'array' or jsonb_array_length(p_follow_ups) <> 3 then
    raise exception 'exactly_three_followups_required' using errcode = '22023';
  end if;
  if p_selected_follow_up_id is null and p_parent_node_id is not null then
    raise exception 'parent_requires_selected_followup' using errcode = '22023';
  end if;
  if p_selected_follow_up_id is not null then
    select * into selected_follow_up from public.follow_up_questions where id = p_selected_follow_up_id for update;
    if not found or selected_follow_up.question_node_id <> p_parent_node_id or selected_follow_up.is_selected or selected_follow_up.child_node_id is not null then
      raise exception 'followup_unavailable' using errcode = '23505';
    end if;
    if not exists (select 1 from public.question_nodes p where p.id = p_parent_node_id and p.inquiry_id = p_inquiry_id and (not p.is_trap or p.trap_resolved_at is not null)) then
      raise exception 'parent_missing_or_trap_unresolved' using errcode = '23514';
    end if;
    if selected_follow_up.question_text <> p_user_question then
      raise exception 'question_must_match_selected_followup' using errcode = '22023';
    end if;
  end if;

  insert into public.question_nodes(inquiry_id, parent_node_id, user_question, ai_explanation, research_mode, is_trap, trap_metadata)
  values (p_inquiry_id, p_parent_node_id, p_user_question, p_ai_explanation, p_research_mode, p_is_trap, p_trap_metadata)
  returning id into new_node_id;

  insert into public.follow_up_questions(question_node_id, position, question_text)
  select new_node_id, ordinality::smallint, value
  from jsonb_array_elements_text(p_follow_ups) with ordinality as f(value, ordinality);

  if p_selected_follow_up_id is not null then
    update public.follow_up_questions set is_selected = true, child_node_id = new_node_id where id = p_selected_follow_up_id;
  end if;
  return new_node_id;
end;
$$;
revoke all on function public.create_question_node(uuid, uuid, uuid, uuid, text, text, boolean, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_question_node(uuid, uuid, uuid, uuid, text, text, boolean, boolean, jsonb, jsonb) to service_role;

create or replace function public.resolve_trap(p_user_id uuid, p_node_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare resolved_at timestamptz;
begin
  if not exists (
    select 1 from public.question_nodes n join public.inquiries i on i.id = n.inquiry_id
    where n.id = p_node_id and i.user_id = p_user_id and n.is_trap and n.trap_resolved_at is null
  ) then raise exception 'trap_unavailable' using errcode = 'P0002'; end if;
  update public.question_nodes set trap_resolved_at = now()
  where id = p_node_id and is_trap and trap_resolved_at is null
  returning trap_resolved_at into resolved_at;
  if resolved_at is null then raise exception 'trap_unavailable' using errcode = 'P0002'; end if;
  return resolved_at;
end;
$$;
revoke all on function public.resolve_trap(uuid, uuid) from public, anon, authenticated;
grant execute on function public.resolve_trap(uuid, uuid) to service_role;
