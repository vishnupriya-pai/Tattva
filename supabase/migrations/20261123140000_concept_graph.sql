-- =========================================================================
-- 20261123140000_concept_graph.sql
-- Knowledge Map Phase 1: concept layer (docs/DATABASE.md §3.6–3.8).
--
-- question_nodes remains the learning-path tree. Concepts are canonical ideas
-- per inquiry; node_concepts is the bipartite question→concept MENTIONS edge;
-- concept_edges are typed concept→concept relations. Cross-branch links fall
-- out of shared concepts instead of being hand-coded.
--
-- Browser-facing access is read-only via RLS. All writes go through
-- attach_node_concepts (service_role only), mirroring create_question_node.
-- =========================================================================

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9+#.]+(-[a-z0-9+#.]+)*$' and char_length(slug) <= 80),
  aliases text[] not null default '{}',
  -- Reserved for Phase 2 community detection; nothing writes it yet.
  community_id integer,
  created_at timestamptz not null default now(),
  constraint concepts_unique_slug_per_inquiry unique (inquiry_id, slug)
);

create index if not exists concepts_inquiry_id_idx on public.concepts (inquiry_id);

create table if not exists public.node_concepts (
  question_node_id uuid not null references public.question_nodes (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  role text not null check (role in ('defines', 'uses', 'contrasts', 'misconceives')),
  weight real not null check (weight >= 0 and weight <= 1),
  created_at timestamptz not null default now(),
  primary key (question_node_id, concept_id)
);

create index if not exists node_concepts_concept_id_idx on public.node_concepts (concept_id);

create table if not exists public.concept_edges (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  source_concept_id uuid not null references public.concepts (id) on delete cascade,
  target_concept_id uuid not null references public.concepts (id) on delete cascade,
  relation_type text not null check (relation_type in (
    'PREREQUISITE_OF', 'CAUSES', 'TRADES_OFF_WITH', 'CONTRASTS_WITH', 'GENERALIZES', 'INSTANCE_OF'
  )),
  justification text not null default '' check (char_length(justification) <= 500),
  origin text not null default 'model' check (origin in ('model', 'predicted', 'learner')),
  confidence real not null default 0.6 check (confidence >= 0 and confidence <= 1),
  source_node_id uuid references public.question_nodes (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint concept_edges_no_self_loop check (source_concept_id <> target_concept_id),
  constraint concept_edges_unique unique (inquiry_id, source_concept_id, target_concept_id, relation_type)
);

create index if not exists concept_edges_inquiry_id_idx on public.concept_edges (inquiry_id);

-- -------------------------------------------------------------------------
-- RLS: owner-only SELECT. No insert/update/delete policies for authenticated.
-- -------------------------------------------------------------------------
alter table public.concepts enable row level security;
alter table public.node_concepts enable row level security;
alter table public.concept_edges enable row level security;

drop policy if exists concepts_select_own on public.concepts;
create policy concepts_select_own on public.concepts
  for select to authenticated
  using (exists (select 1 from public.inquiries i where i.id = concepts.inquiry_id and i.user_id = auth.uid()));

drop policy if exists node_concepts_select_own on public.node_concepts;
create policy node_concepts_select_own on public.node_concepts
  for select to authenticated
  using (exists (
    select 1 from public.question_nodes n join public.inquiries i on i.id = n.inquiry_id
    where n.id = node_concepts.question_node_id and i.user_id = auth.uid()
  ));

drop policy if exists concept_edges_select_own on public.concept_edges;
create policy concept_edges_select_own on public.concept_edges
  for select to authenticated
  using (exists (select 1 from public.inquiries i where i.id = concept_edges.inquiry_id and i.user_id = auth.uid()));

-- -------------------------------------------------------------------------
-- attach_node_concepts
--   p_concepts:  [{"name": text, "slug": text, "role": text, "weight": number}]
--   p_relations: [{"fromSlug": text, "toSlug": text, "type": text, "justification": text}]
-- Upserts concepts by (inquiry, slug), recording differing surface names as
-- aliases; links them to the node; inserts relations whose endpoints exist in
-- this inquiry. Re-asserting an existing edge from a different node raises its
-- confidence (independent corroboration). Returns the number of relations stored.
-- -------------------------------------------------------------------------
create or replace function public.attach_node_concepts(
  p_user_id uuid,
  p_node_id uuid,
  p_concepts jsonb,
  p_relations jsonb
) returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_inquiry_id uuid;
  v_item jsonb;
  v_concept_id uuid;
  v_from uuid;
  v_to uuid;
  v_stored integer := 0;
begin
  select n.inquiry_id into v_inquiry_id
  from public.question_nodes n join public.inquiries i on i.id = n.inquiry_id
  where n.id = p_node_id and i.user_id = p_user_id;
  if v_inquiry_id is null then
    raise exception 'node_not_found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_concepts) <> 'array' or jsonb_typeof(p_relations) <> 'array' then
    raise exception 'concepts_and_relations_must_be_arrays' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_concepts) loop
    insert into public.concepts as c (inquiry_id, name, slug)
    values (v_inquiry_id, v_item->>'name', v_item->>'slug')
    on conflict (inquiry_id, slug) do update
      set aliases = case
        when lower(excluded.name) = lower(c.name) or excluded.name = any (c.aliases) then c.aliases
        else array_append(c.aliases, excluded.name)
      end
    returning c.id into v_concept_id;

    insert into public.node_concepts as nc (question_node_id, concept_id, role, weight)
    values (p_node_id, v_concept_id, v_item->>'role', (v_item->>'weight')::real)
    on conflict (question_node_id, concept_id) do update
      set weight = greatest(nc.weight, excluded.weight), role = excluded.role;
  end loop;

  for v_item in select value from jsonb_array_elements(p_relations) loop
    select id into v_from from public.concepts where inquiry_id = v_inquiry_id and slug = v_item->>'fromSlug';
    select id into v_to from public.concepts where inquiry_id = v_inquiry_id and slug = v_item->>'toSlug';
    continue when v_from is null or v_to is null or v_from = v_to;

    insert into public.concept_edges as e
      (inquiry_id, source_concept_id, target_concept_id, relation_type, justification, origin, source_node_id)
    values (v_inquiry_id, v_from, v_to, v_item->>'type', left(coalesce(v_item->>'justification', ''), 500), 'model', p_node_id)
    on conflict (inquiry_id, source_concept_id, target_concept_id, relation_type) do update
      set confidence = case
        when e.source_node_id is distinct from p_node_id then least(1, e.confidence + 0.1)
        else e.confidence
      end;
    v_stored := v_stored + 1;
  end loop;

  return v_stored;
end;
$$;

revoke all on function public.attach_node_concepts(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.attach_node_concepts(uuid, uuid, jsonb, jsonb) to service_role;

-- =========================================================================
-- Phase 2: verified "hidden connections" (docs/DATABASE.md §3.9).
-- Link prediction (Adamic–Adar) proposes concept pairs; Sarvam verifies them.
-- Accepted pairs become concept_edges with origin = 'predicted'. Rejected pairs
-- are remembered so the same guess is never re-proposed (or re-billed).
-- =========================================================================
create table if not exists public.concept_link_rejections (
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  concept_a uuid not null references public.concepts (id) on delete cascade,
  concept_b uuid not null references public.concepts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (inquiry_id, concept_a, concept_b),
  constraint concept_link_rejections_ordered check (concept_a < concept_b)
);

alter table public.concept_link_rejections enable row level security;

drop policy if exists concept_link_rejections_select_own on public.concept_link_rejections;
create policy concept_link_rejections_select_own on public.concept_link_rejections
  for select to authenticated
  using (exists (select 1 from public.inquiries i where i.id = concept_link_rejections.inquiry_id and i.user_id = auth.uid()));

-- p_edges:    [{"sourceConceptId": uuid, "targetConceptId": uuid, "type": text, "justification": text, "confidence": number}]
-- p_rejected: [{"a": uuid, "b": uuid}]
-- Every concept must belong to p_inquiry_id, which must belong to p_user_id.
-- Returns the number of new edges inserted.
create or replace function public.add_predicted_concept_edges(
  p_user_id uuid,
  p_inquiry_id uuid,
  p_edges jsonb,
  p_rejected jsonb
) returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item jsonb;
  v_src uuid;
  v_dst uuid;
  v_rows integer;
  v_inserted integer := 0;
begin
  if not exists (select 1 from public.inquiries i where i.id = p_inquiry_id and i.user_id = p_user_id) then
    raise exception 'inquiry_not_found' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_edges) <> 'array' or jsonb_typeof(p_rejected) <> 'array' then
    raise exception 'edges_and_rejections_must_be_arrays' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_edges) loop
    v_src := (v_item->>'sourceConceptId')::uuid;
    v_dst := (v_item->>'targetConceptId')::uuid;
    if (select count(*) from public.concepts c where c.inquiry_id = p_inquiry_id and c.id in (v_src, v_dst)) <> 2 then
      raise exception 'concept_not_in_inquiry' using errcode = '22023';
    end if;
    insert into public.concept_edges
      (inquiry_id, source_concept_id, target_concept_id, relation_type, justification, origin, confidence)
    values (
      p_inquiry_id, v_src, v_dst, v_item->>'type', left(coalesce(v_item->>'justification', ''), 500), 'predicted',
      least(0.7, greatest(0, coalesce((v_item->>'confidence')::real, 0.5)))
    )
    on conflict (inquiry_id, source_concept_id, target_concept_id, relation_type) do nothing;
    get diagnostics v_rows = row_count;
    v_inserted := v_inserted + v_rows;
  end loop;

  for v_item in select value from jsonb_array_elements(p_rejected) loop
    v_src := (v_item->>'a')::uuid;
    v_dst := (v_item->>'b')::uuid;
    continue when v_src = v_dst;
    if (select count(*) from public.concepts c where c.inquiry_id = p_inquiry_id and c.id in (v_src, v_dst)) <> 2 then
      raise exception 'concept_not_in_inquiry' using errcode = '22023';
    end if;
    insert into public.concept_link_rejections (inquiry_id, concept_a, concept_b)
    values (p_inquiry_id, least(v_src, v_dst), greatest(v_src, v_dst))
    on conflict do nothing;
  end loop;

  return v_inserted;
end;
$$;

revoke all on function public.add_predicted_concept_edges(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.add_predicted_concept_edges(uuid, uuid, jsonb, jsonb) to service_role;

-- Connection discovery calls Sarvam, so it gets its own daily quota kind
-- (ai_usage comes from 20261123130000_ai_usage_quota.sql).
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('question', 'trap', 'voice', 'discover'));
