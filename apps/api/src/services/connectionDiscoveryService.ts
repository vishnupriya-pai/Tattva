import {
  CONCEPT_RELATION_TYPES,
  type ConceptGraph,
  type ConceptRelationType,
  type DiscoverConnectionsResponse,
} from '@tattva/contracts';
import {
  acceptAcyclic,
  adamicAdar,
  buildConceptNetwork,
  prerequisiteEdgesOf,
} from '@tattva/graph-analytics';
import {
  createRequestScopedClient,
  getAdminClient,
  isSupabaseAdminConfigured,
} from '../integrations/supabase/client';
import { verifyConceptLinks } from '../integrations/sarvam/client';
import { findInquiryByIdForUser } from '../repositories/inquiryRepository';
import {
  addPredictedEdges,
  listConceptGraphForInquiry,
  listRejectedConceptPairs,
  type PredictedEdgeInput,
} from '../repositories/conceptGraphRepository';
import { ApiError } from '../types/api';

/**
 * "Hidden connections" (docs/INTELLIGENCE_ARCHITECTURE.md §13): Adamic–Adar
 * link prediction over the concept network proposes pairs that share
 * neighbours but aren't linked; one Sarvam call verifies them; accepted ones
 * are stored as origin='predicted' edges and rejected ones are remembered so
 * they are never proposed (or paid for) again. Unverified predictions are
 * never stored or shown as fact.
 */

export const MAX_PAIRS_PER_DISCOVERY = 5;
/** Below this the model's own confidence is treated as a rejection. */
const MIN_ACCEPT_CONFIDENCE = 0.5;
const MAX_JUSTIFICATION_CHARS = 240;

export interface CandidatePair {
  a: string;
  b: string;
}

export interface LinkVerdict {
  pairIndex: number;
  valid: boolean;
  /** Present when valid. */
  edge?: { from: 'A' | 'B'; type: ConceptRelationType; justification: string; confidence: number };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates the verifier's payload item by item. Anything malformed, missing,
 * low-confidence, or with an unknown type counts as a rejection, so a bad
 * response can only make the graph more conservative, never add junk.
 */
export function parseLinkVerdicts(payload: unknown, pairCount: number): LinkVerdict[] {
  const verdicts: LinkVerdict[] = Array.from({ length: pairCount }, (_, pairIndex) => ({
    pairIndex,
    valid: false,
  }));
  const raw = isRecord(payload) && Array.isArray(payload.verdicts) ? payload.verdicts : [];
  const seen = new Set<number>();
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const pair = typeof item.pair === 'number' ? item.pair : Number(item.pair);
    const pairIndex = pair - 1;
    if (
      !Number.isInteger(pairIndex) ||
      pairIndex < 0 ||
      pairIndex >= pairCount ||
      seen.has(pairIndex)
    )
      continue;
    seen.add(pairIndex);
    if (item.valid !== true) continue;
    const type =
      typeof item.type === 'string'
        ? item.type
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, '_')
        : '';
    const from = item.from === 'A' || item.from === 'B' ? item.from : null;
    const why =
      typeof item.why === 'string'
        ? item.why.replace(/\s+/g, ' ').trim().slice(0, MAX_JUSTIFICATION_CHARS)
        : '';
    const confidence =
      typeof item.confidence === 'number' && Number.isFinite(item.confidence)
        ? Math.min(1, Math.max(0, item.confidence))
        : 0;
    if (
      !(CONCEPT_RELATION_TYPES as readonly string[]).includes(type) ||
      !from ||
      !why ||
      confidence < MIN_ACCEPT_CONFIDENCE
    )
      continue;
    verdicts[pairIndex] = {
      pairIndex,
      valid: true,
      edge: { from, type: type as ConceptRelationType, justification: why, confidence },
    };
  }
  return verdicts;
}

/**
 * Turns verdicts into stored edges + rejections. Prerequisite edges that would
 * create a cycle are downgraded to rejections, keeping PREREQUISITE_OF a DAG.
 */
export function planPredictedEdges(
  pairs: readonly CandidatePair[],
  verdicts: readonly LinkVerdict[],
  graph: ConceptGraph,
): { edges: PredictedEdgeInput[]; rejected: CandidatePair[] } {
  const edges: PredictedEdgeInput[] = [];
  const rejected: CandidatePair[] = [];
  const prerequisites = prerequisiteEdgesOf(graph);
  for (const verdict of verdicts) {
    const pair = pairs[verdict.pairIndex]!;
    if (!verdict.valid || !verdict.edge) {
      rejected.push(pair);
      continue;
    }
    const [source, target] = verdict.edge.from === 'A' ? [pair.a, pair.b] : [pair.b, pair.a];
    if (verdict.edge.type === 'PREREQUISITE_OF') {
      const { accepted } = acceptAcyclic(prerequisites, [{ from: source, to: target }]);
      if (accepted.length === 0) {
        rejected.push(pair);
        continue;
      }
      prerequisites.push({ from: source, to: target });
    }
    edges.push({
      sourceConceptId: source,
      targetConceptId: target,
      type: verdict.edge.type,
      justification: verdict.edge.justification,
      confidence: verdict.edge.confidence,
    });
  }
  return { edges, rejected };
}

export async function discoverConnectionsForUser(
  accessToken: string,
  userId: string,
  inquiryId: string,
): Promise<DiscoverConnectionsResponse['data']> {
  const client = createRequestScopedClient(accessToken);
  const inquiry = await findInquiryByIdForUser(client, inquiryId, userId);
  if (!inquiry) throw new ApiError(404, 'inquiry_not_found', 'Inquiry not found');
  if (!isSupabaseAdminConfigured()) {
    throw new ApiError(
      503,
      'admin_database_not_configured',
      'Set SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.local to enable graph writes.',
    );
  }

  const graph = await listConceptGraphForInquiry(client, inquiryId);
  const rejectedBefore = await listRejectedConceptPairs(client, inquiryId);
  const predictions = adamicAdar(buildConceptNetwork(graph), {
    topK: MAX_PAIRS_PER_DISCOVERY,
    exclude: rejectedBefore,
  });
  if (predictions.length === 0) return { added: [], rejectedCount: 0, consideredCount: 0 };

  const nameOf = new Map(graph.concepts.map((c) => [c.id, c.name]));
  const pairs: CandidatePair[] = predictions.map((p) => ({
    a: p.sourceConceptId,
    b: p.targetConceptId,
  }));
  const payload = await verifyConceptLinks({
    topic: inquiry.title ?? 'computer science',
    pairs: predictions.map((p) => ({
      a: nameOf.get(p.sourceConceptId) ?? p.sourceConceptId,
      b: nameOf.get(p.targetConceptId) ?? p.targetConceptId,
      via: p.commonNeighborIds.map((id) => nameOf.get(id) ?? id),
    })),
  });

  const { edges, rejected } = planPredictedEdges(
    pairs,
    parseLinkVerdicts(payload, pairs.length),
    graph,
  );
  await addPredictedEdges(getAdminClient(), { userId, inquiryId, edges, rejected });

  const after = await listConceptGraphForInquiry(client, inquiryId);
  const wanted = new Set(edges.map((e) => `${e.sourceConceptId}|${e.targetConceptId}|${e.type}`));
  const added = after.conceptEdges.filter(
    (e) =>
      e.origin === 'predicted' &&
      wanted.has(`${e.sourceConceptId}|${e.targetConceptId}|${e.relationType}`),
  );
  return { added, rejectedCount: rejected.length, consideredCount: pairs.length };
}
