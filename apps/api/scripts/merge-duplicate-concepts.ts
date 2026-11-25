/**
 * Merges duplicate concepts in existing inquiries ("TLB" and
 * "Translation Lookaside Buffer" stored as two concepts), using the same
 * matching rules as live extraction (findDuplicateConcepts).
 *
 * Usage (from apps/api):
 *   npx tsx scripts/merge-duplicate-concepts.ts <inquiryId> [<inquiryId> ...]          # dry run
 *   npx tsx scripts/merge-duplicate-concepts.ts <inquiryId> [<inquiryId> ...] --apply  # write
 *
 * For each duplicate D → canonical C: D's question links move to C (keeping
 * the higher weight), D's relations are re-pointed to C (dropping self-loops
 * and exact duplicates), D's name is added to C's aliases, then D is deleted.
 * No Sarvam calls.
 */
import { getAdminClient, isSupabaseAdminConfigured } from '../src/integrations/supabase/client';
import { findDuplicateConcepts } from '../src/services/conceptExtraction';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ConceptRow {
  id: string;
  name: string;
  slug: string;
  aliases: string[] | null;
}

function fail(step: string, error: { message: string } | null): void {
  if (error) throw new Error(`${step}: ${error.message}`);
}

async function mergeInquiry(inquiryId: string, apply: boolean) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('concepts')
    .select('id, name, slug, aliases')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });
  fail('load concepts', error);
  const concepts = (data ?? []) as ConceptRow[];
  const bySlug = new Map(concepts.map((c) => [c.slug, c]));
  const pairs = findDuplicateConcepts(concepts.map((c) => ({ name: c.name, slug: c.slug, aliases: c.aliases ?? [] })));

  console.log(`Inquiry ${inquiryId}: ${concepts.length} concepts, ${pairs.length} duplicates.`);
  for (const { duplicate, canonical } of pairs) {
    const d = bySlug.get(duplicate)!;
    const c = bySlug.get(canonical)!;
    console.log(`  ${apply ? 'merge' : '[dry-run]'} "${d.name}" → "${c.name}"`);
    if (!apply) continue;

    // 1. Question links: move to C, keeping the stronger mention.
    const { data: links, error: linksError } = await admin
      .from('node_concepts')
      .select('question_node_id, concept_id, role, weight')
      .in('concept_id', [d.id, c.id]);
    fail('load links', linksError);
    const onC = new Map(
      (links ?? []).filter((l) => l.concept_id === c.id).map((l) => [l.question_node_id as string, l]),
    );
    for (const link of (links ?? []).filter((l) => l.concept_id === d.id)) {
      const existing = onC.get(link.question_node_id as string);
      if (!existing) {
        const { error: insertError } = await admin
          .from('node_concepts')
          .insert({ question_node_id: link.question_node_id, concept_id: c.id, role: link.role, weight: link.weight });
        fail('move link', insertError);
      } else if (Number(link.weight) > Number(existing.weight)) {
        const { error: updateError } = await admin
          .from('node_concepts')
          .update({ weight: link.weight, role: link.role })
          .eq('question_node_id', link.question_node_id)
          .eq('concept_id', c.id);
        fail('update link', updateError);
      }
    }

    // 2. Relations: re-point D's edges to C unless that makes a self-loop or a duplicate.
    const { data: edges, error: edgesError } = await admin
      .from('concept_edges')
      .select('id, source_concept_id, target_concept_id, relation_type')
      .eq('inquiry_id', inquiryId);
    fail('load edges', edgesError);
    const key = (s: string, t: string, type: string) => `${s}|${t}|${type}`;
    const existingKeys = new Set(
      (edges ?? [])
        .filter((e) => e.source_concept_id !== d.id && e.target_concept_id !== d.id)
        .map((e) => key(e.source_concept_id, e.target_concept_id, e.relation_type)),
    );
    for (const e of (edges ?? []).filter((x) => x.source_concept_id === d.id || x.target_concept_id === d.id)) {
      const source = e.source_concept_id === d.id ? c.id : e.source_concept_id;
      const target = e.target_concept_id === d.id ? c.id : e.target_concept_id;
      const k = key(source, target, e.relation_type);
      if (source === target || existingKeys.has(k)) continue; // removed with D below
      const { error: moveError } = await admin
        .from('concept_edges')
        .update({ source_concept_id: source, target_concept_id: target })
        .eq('id', e.id);
      fail('move edge', moveError);
      existingKeys.add(k);
    }

    // 3. Keep D's wording as an alias of C, then delete D (cascades leftovers).
    const aliases = [...new Set([...(c.aliases ?? []), d.name, ...(d.aliases ?? [])])].filter(
      (a) => a.toLowerCase() !== c.name.toLowerCase(),
    );
    const { error: aliasError } = await admin.from('concepts').update({ aliases }).eq('id', c.id);
    fail('update aliases', aliasError);
    c.aliases = aliases;
    const { error: deleteError } = await admin.from('concepts').delete().eq('id', d.id);
    fail('delete duplicate', deleteError);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const ids = args.filter((a) => a !== '--apply');
  if (ids.length === 0 || ids.some((id) => !UUID.test(id))) {
    console.error('Usage: npx tsx scripts/merge-duplicate-concepts.ts <inquiryId> [...] [--apply]');
    process.exit(1);
  }
  if (!isSupabaseAdminConfigured()) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set; see docs/environment-variables.md.');
    process.exit(1);
  }
  for (const id of ids) await mergeInquiry(id, apply);
  if (!apply) console.log('\nDry run only. Re-run with --apply to write.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
