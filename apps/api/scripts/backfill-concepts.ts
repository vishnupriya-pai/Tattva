/**
 * Backfills the concept layer for nodes created before
 * supabase/migrations/20261123140000_concept_graph.sql existed.
 *
 * Usage (from apps/api):
 *   npx tsx scripts/backfill-concepts.ts <inquiryId> [<inquiryId> ...] [--dry-run]
 *
 * Costs one Sarvam call per node that has no concepts yet. Nodes are processed
 * oldest first and the graph is reloaded after each write, so later nodes reuse
 * earlier concept names and can form cross-branch relations. Re-running skips
 * nodes that already have concepts.
 */
import { getAdminClient, isSupabaseAdminConfigured } from '../src/integrations/supabase/client';
import { extractConcepts } from '../src/integrations/sarvam/client';
import { listNodesForInquiry } from '../src/repositories/questionNodeRepository';
import {
  attachNodeConcepts,
  listConceptGraphForInquiry,
} from '../src/repositories/conceptGraphRepository';
import { buildConceptPromptContext } from '../src/services/graphContext';
import { resolveAgainstKnown } from '../src/services/conceptExtraction';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function backfillInquiry(inquiryId: string, dryRun: boolean) {
  const admin = getAdminClient();
  const { data: inquiry, error } = await admin
    .from('inquiries')
    .select('id, user_id')
    .eq('id', inquiryId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load inquiry ${inquiryId}: ${error.message}`);
  if (!inquiry) {
    console.error(`Inquiry ${inquiryId} not found; skipping.`);
    return;
  }

  const nodes = await listNodesForInquiry(admin, inquiryId);
  let graph = await listConceptGraphForInquiry(admin, inquiryId);
  const done = new Set(graph.nodeConcepts.map((link) => link.questionNodeId));
  console.log(`Inquiry ${inquiryId}: ${nodes.length} nodes, ${done.size} already have concepts.`);

  for (const node of nodes) {
    if (done.has(node.id)) continue;
    const context = buildConceptPromptContext(nodes, node.parentNodeId, graph);
    const raw = await extractConcepts({
      question: node.userQuestion,
      answer: node.aiExplanation,
      otherBranches: context.otherBranches,
      knownConcepts: context.knownConcepts,
      knownConceptSlugs: context.knownConceptSlugs,
    });
    const extraction = resolveAgainstKnown(raw, context.known);
    const summary = `${extraction.concepts.map((c) => c.name).join(', ') || '(none)'} | ${extraction.relations.length} relations`;

    if (dryRun) {
      console.log(`  [dry-run] ${node.id}: ${summary}`);
      for (const r of extraction.relations)
        console.log(`      ${r.fromSlug} -${r.type}-> ${r.toSlug}`);
      continue;
    }
    const stored = await attachNodeConcepts(admin, {
      userId: inquiry.user_id as string,
      nodeId: node.id,
      extraction,
    });
    if (stored === null)
      throw new Error('Concept graph tables are missing. Apply the migration first.');
    console.log(`  ${node.id}: ${summary} (${stored} stored)`);
    graph = await listConceptGraphForInquiry(admin, inquiryId);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const inquiryIds = args.filter((arg) => !arg.startsWith('--'));
  if (inquiryIds.length === 0 || inquiryIds.some((id) => !UUID.test(id))) {
    console.error(
      'Usage: npx tsx scripts/backfill-concepts.ts <inquiryId> [<inquiryId> ...] [--dry-run]',
    );
    process.exit(1);
  }
  if (!isSupabaseAdminConfigured()) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in apps/api/.env.local.');
    process.exit(1);
  }
  for (const id of inquiryIds) await backfillInquiry(id, dryRun);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
