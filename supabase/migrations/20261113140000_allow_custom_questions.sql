-- Allow learners to ask their own questions branching from any parent node
-- in addition to choosing pre-generated follow-up questions.

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
  if p_parent_node_id is not null then
    if not exists (select 1 from public.question_nodes p where p.id = p_parent_node_id and p.inquiry_id = p_inquiry_id and (not p.is_trap or p.trap_resolved_at is not null)) then
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
