import type { KnowledgeGraphAnalysis } from '@tattva/graph-analytics';
import type { QuestionNode } from './workspace-types';

/**
 * Per-node display metrics for the Knowledge Map, derived from the concept
 * analysis in @tattva/graph-analytics. Nothing here is topic-specific: tags
 * come from the node's own extracted concepts, and "deep" means demonstrated
 * understanding (mastery), not reply count.
 *
 * Red is reserved for unresolved traps (rendered from the node itself), so
 * there is no keyword-based "divergent" tier any more.
 */
export type DiscussionTier = 'initial' | 'moderate' | 'deep';

export interface NodeMetrics {
  tier: DiscussionTier;
  depth: number;
  childCount: number;
  exploredFollowUpsCount: number;
  /** Mean mastery (0–1) of the node's concepts; null before concepts exist. */
  mastery: number | null;
  /** Name of the node's heaviest concept, or a short form of the question. */
  conceptTag: string;
}

/** Mean concept mastery at which a node counts as a deep dive. */
const DEEP_MASTERY = 0.6;
const FALLBACK_TAG_CHARS = 22;

function fallbackTag(question: string): string {
  const clean = question
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[?.!]+$/, '');
  return clean.length <= FALLBACK_TAG_CHARS
    ? clean
    : `${clean.slice(0, FALLBACK_TAG_CHARS - 1).trimEnd()}…`;
}

export function computeNodeMetrics(
  nodes: readonly QuestionNode[],
  analysis?: KnowledgeGraphAnalysis,
): Map<string, NodeMetrics> {
  const parent = new Map(nodes.map((n) => [n.id, n.parentNodeId]));
  const childCount = new Map<string, number>();
  for (const n of nodes)
    if (n.parentNodeId) childCount.set(n.parentNodeId, (childCount.get(n.parentNodeId) ?? 0) + 1);

  const depthOf = (id: string): number => {
    let depth = 0;
    let cur = parent.get(id) ?? null;
    while (cur && depth < 100) {
      depth += 1;
      cur = parent.get(cur) ?? null;
    }
    return depth;
  };

  const metrics = new Map<string, NodeMetrics>();
  for (const node of nodes) {
    const insight = analysis?.nodes[node.id];
    const primary = insight?.primaryConceptId
      ? analysis?.concepts[insight.primaryConceptId]
      : undefined;
    const mastery = insight?.meanMastery ?? null;
    const children = childCount.get(node.id) ?? 0;
    const explored = node.followUps.filter((f) => f.isSelected || f.childNodeId).length;
    const trapSurvived = node.isTrap && Boolean(node.trapResolvedAt);

    const tier: DiscussionTier =
      trapSurvived || (mastery !== null && mastery >= DEEP_MASTERY)
        ? 'deep'
        : children > 0 || explored > 0
          ? 'moderate'
          : 'initial';

    metrics.set(node.id, {
      tier,
      depth: depthOf(node.id),
      childCount: children,
      exploredFollowUpsCount: explored,
      mastery,
      conceptTag: primary?.name ?? fallbackTag(node.userQuestion),
    });
  }
  return metrics;
}
