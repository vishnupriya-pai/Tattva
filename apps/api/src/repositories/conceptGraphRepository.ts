import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConceptGraph, ConceptRelationType, ConceptRole } from '@tattva/contracts';
import { getAdminClient, isSupabaseAdminConfigured } from '../integrations/supabase/client';
import type { ConceptExtraction } from '../services/conceptExtraction';
import { logger } from '../utils/logger';
import { ApiError } from '../types/api';

/**
 * Persistence for the concept layer (docs/DATABASE.md §3.6–3.8,
 * supabase/migrations/20261123140000_concept_graph.sql).
 *
 * Reads degrade to an empty graph when the migration hasn't been applied yet,
 * so the existing workspace keeps working on databases without it.
 */

const MISSING_RELATION_CODES = new Set(['42P01', 'PGRST205', 'PGRST202']);

function isMissingSchema(error: { code?: string } | null): boolean {
  return Boolean(error?.code && MISSING_RELATION_CODES.has(error.code));
}

let warnedMissingSchema = false;
function warnMissingSchemaOnce() {
  if (warnedMissingSchema) return;
  warnedMissingSchema = true;
  logger.warn(
    'Concept graph tables are missing; apply supabase/migrations/20261123140000_concept_graph.sql',
  );
}

interface ConceptRow {
  id: string;
  name: string;
  slug: string;
  aliases: string[] | null;
  created_at: string;
}
interface NodeConceptRow {
  question_node_id: string;
  concept_id: string;
  role: ConceptRole;
  weight: number;
}
interface ConceptEdgeRow {
  id: string;
  source_concept_id: string;
  target_concept_id: string;
  relation_type: ConceptRelationType;
  justification: string;
  origin: 'model' | 'predicted' | 'learner';
  confidence: number;
  source_node_id: string | null;
  created_at: string;
}

const EMPTY: ConceptGraph = { concepts: [], nodeConcepts: [], conceptEdges: [] };

export async function listConceptGraphForInquiry(
  client: SupabaseClient,
  inquiryId: string,
): Promise<ConceptGraph> {
  const queryClient = isSupabaseAdminConfigured() ? getAdminClient() : client;

  const conceptsResult = await queryClient
    .from('concepts')
    .select('id, name, slug, aliases, created_at')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });
  if (isMissingSchema(conceptsResult.error)) {
    warnMissingSchemaOnce();
    return EMPTY;
  }
  if (conceptsResult.error)
    throw new Error(`Failed to load concepts: ${conceptsResult.error.message}`);
  const concepts = (conceptsResult.data ?? []) as ConceptRow[];
  if (concepts.length === 0) return EMPTY;

  const [linksResult, edgesResult] = await Promise.all([
    queryClient
      .from('node_concepts')
      .select('question_node_id, concept_id, role, weight')
      .in(
        'concept_id',
        concepts.map((c) => c.id),
      ),
    queryClient
      .from('concept_edges')
      .select(
        'id, source_concept_id, target_concept_id, relation_type, justification, origin, confidence, source_node_id, created_at',
      )
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: true }),
  ]);
  if (linksResult.error)
    throw new Error(`Failed to load node concepts: ${linksResult.error.message}`);
  if (edgesResult.error)
    throw new Error(`Failed to load concept edges: ${edgesResult.error.message}`);

  return {
    concepts: concepts.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      aliases: row.aliases ?? [],
      createdAt: row.created_at,
    })),
    nodeConcepts: ((linksResult.data ?? []) as NodeConceptRow[]).map((row) => ({
      questionNodeId: row.question_node_id,
      conceptId: row.concept_id,
      role: row.role,
      weight: Number(row.weight),
    })),
    conceptEdges: ((edgesResult.data ?? []) as ConceptEdgeRow[]).map((row) => ({
      id: row.id,
      sourceConceptId: row.source_concept_id,
      targetConceptId: row.target_concept_id,
      relationType: row.relation_type,
      justification: row.justification,
      origin: row.origin,
      confidence: Number(row.confidence),
      sourceNodeId: row.source_node_id,
      createdAt: row.created_at,
    })),
  };
}

/** Writes one node's extraction via the service-role RPC. Returns relations stored, or null if the schema is missing. */
export async function attachNodeConcepts(
  client: SupabaseClient,
  input: { userId: string; nodeId: string; extraction: ConceptExtraction },
): Promise<number | null> {
  if (input.extraction.concepts.length === 0 && input.extraction.relations.length === 0) return 0;
  const { data, error } = await client.rpc('attach_node_concepts', {
    p_user_id: input.userId,
    p_node_id: input.nodeId,
    p_concepts: input.extraction.concepts.map(({ name, slug, role, weight }) => ({
      name,
      slug,
      role,
      weight,
    })),
    p_relations: input.extraction.relations,
  });
  if (isMissingSchema(error)) {
    warnMissingSchemaOnce();
    return null;
  }
  if (error) throw new Error(`Failed to attach concepts: ${error.message}`);
  return typeof data === 'number' ? data : 0;
}

/** Pair keys ("a|b", a < b) the verifier already rejected for this inquiry. Empty if the table is missing. */
export async function listRejectedConceptPairs(client: SupabaseClient, inquiryId: string): Promise<Set<string>> {
  const queryClient = isSupabaseAdminConfigured() ? getAdminClient() : client;
  const { data, error } = await queryClient
    .from('concept_link_rejections')
    .select('concept_a, concept_b')
    .eq('inquiry_id', inquiryId);
  if (isMissingSchema(error)) {
    warnMissingSchemaOnce();
    return new Set();
  }
  if (error) throw new Error(`Failed to load rejected concept pairs: ${error.message}`);
  return new Set(
    ((data ?? []) as Array<{ concept_a: string; concept_b: string }>).map(({ concept_a: a, concept_b: b }) =>
      a < b ? `${a}|${b}` : `${b}|${a}`,
    ),
  );
}

export interface PredictedEdgeInput {
  sourceConceptId: string;
  targetConceptId: string;
  type: ConceptRelationType;
  justification: string;
  confidence: number;
}

/** Stores verified predicted edges and remembers rejected pairs, atomically. */
export async function addPredictedEdges(
  client: SupabaseClient,
  input: {
    userId: string;
    inquiryId: string;
    edges: PredictedEdgeInput[];
    rejected: Array<{ a: string; b: string }>;
  },
): Promise<number> {
  if (input.edges.length === 0 && input.rejected.length === 0) return 0;
  const { data, error } = await client.rpc('add_predicted_concept_edges', {
    p_user_id: input.userId,
    p_inquiry_id: input.inquiryId,
    p_edges: input.edges,
    p_rejected: input.rejected,
  });
  if (isMissingSchema(error)) {
    throw new ApiError(503, 'concept_graph_not_migrated', 'Apply supabase/migrations/20261123140000_concept_graph.sql to enable hidden connections.');
  }
  if (error) throw new Error(`Failed to store predicted edges: ${error.message}`);
  return typeof data === 'number' ? data : 0;
}
