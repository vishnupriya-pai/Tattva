import type { ConceptEdge, ConceptGraph, ConceptRelationType } from '@tattva/contracts';
import {
  buildConceptNetwork,
  type KnowledgeGraphAnalysis,
  type MasteryStatus,
} from '@tattva/graph-analytics';

/**
 * View model and layout for the Concepts tab of the Knowledge Map
 * (docs/INTELLIGENCE_ARCHITECTURE.md §14). Vertices are concepts, edges are
 * typed concept relations. Pure and deterministic so the same graph always
 * draws the same picture.
 */

export interface ConceptMapNode {
  id: string;
  name: string;
  mentionCount: number;
  status: MasteryStatus;
  score: number;
  communityId: number;
  isKeystone: boolean;
  /** Bubble radius in px; grows with how many questions mention the concept. */
  radius: number;
  /** Question node ids that mention this concept, heaviest mention first. */
  questionIds: string[];
}

export interface ConceptMapEdge {
  id: string;
  source: string;
  target: string;
  relationType: ConceptRelationType;
  /** Symmetric relations (trade-offs, contrasts) are drawn without an arrow. */
  directed: boolean;
  label: string;
  justification: string;
  predicted: boolean;
  confidence: number;
}

export interface ConceptMapModel {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  /** Concepts left out by the clutter guard. */
  hiddenCount: number;
}

export const RELATION_LABEL: Record<ConceptRelationType, string> = {
  PREREQUISITE_OF: 'needed for',
  CAUSES: 'causes',
  TRADES_OFF_WITH: 'trades off with',
  CONTRASTS_WITH: 'contrasts with',
  GENERALIZES: 'generalizes',
  INSTANCE_OF: 'is a kind of',
};

const SYMMETRIC: ReadonlySet<ConceptRelationType> = new Set(['TRADES_OFF_WITH', 'CONTRASTS_WITH']);

/** Edges below this confidence are not drawn (model edges start at 0.6). */
export const MIN_EDGE_CONFIDENCE = 0.5;
/** Above this many concepts, single-mention concepts with no relations are hidden. */
export const CLUTTER_THRESHOLD = 40;

const MIN_RADIUS = 16;
const RADIUS_STEP = 4;
const MAX_RADIUS = 36;

export function conceptRadius(mentionCount: number): number {
  return Math.min(MAX_RADIUS, MIN_RADIUS + RADIUS_STEP * Math.max(0, mentionCount - 1));
}

function isDrawable(edge: ConceptEdge): boolean {
  return edge.origin === 'learner' || edge.confidence >= MIN_EDGE_CONFIDENCE;
}

export function buildConceptMap(graph: ConceptGraph, analysis: KnowledgeGraphAnalysis): ConceptMapModel {
  const questionsByConcept = new Map<string, Array<{ id: string; weight: number }>>();
  for (const link of graph.nodeConcepts) {
    const list = questionsByConcept.get(link.conceptId) ?? [];
    list.push({ id: link.questionNodeId, weight: link.weight });
    questionsByConcept.set(link.conceptId, list);
  }

  const drawable = graph.conceptEdges.filter(isDrawable);
  const related = new Set<string>();
  for (const e of drawable) {
    related.add(e.sourceConceptId);
    related.add(e.targetConceptId);
  }

  const crowded = graph.concepts.length > CLUTTER_THRESHOLD;
  const nodes: ConceptMapNode[] = [];
  for (const concept of graph.concepts) {
    const insight = analysis.concepts[concept.id];
    if (!insight) continue;
    if (crowded && insight.mentionCount <= 1 && !related.has(concept.id)) continue;
    nodes.push({
      id: concept.id,
      name: concept.name,
      mentionCount: insight.mentionCount,
      status: insight.mastery.status,
      score: insight.mastery.score,
      communityId: insight.communityId,
      isKeystone: insight.isKeystone,
      radius: conceptRadius(insight.mentionCount),
      questionIds: (questionsByConcept.get(concept.id) ?? [])
        .slice()
        .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
        .map((q) => q.id),
    });
  }
  nodes.sort((a, b) => a.id.localeCompare(b.id));
  const shown = new Set(nodes.map((n) => n.id));

  const seen = new Set<string>();
  const edges: ConceptMapEdge[] = [];
  for (const e of drawable) {
    if (!shown.has(e.sourceConceptId) || !shown.has(e.targetConceptId)) continue;
    const directed = !SYMMETRIC.has(e.relationType);
    const [a, b] = directed
      ? [e.sourceConceptId, e.targetConceptId]
      : [e.sourceConceptId, e.targetConceptId].sort();
    const key = `${a}|${e.relationType}|${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({
      id: e.id,
      source: e.sourceConceptId,
      target: e.targetConceptId,
      relationType: e.relationType,
      directed,
      label: RELATION_LABEL[e.relationType],
      justification: e.justification,
      predicted: e.origin === 'predicted',
      confidence: e.confidence,
    });
  }
  edges.sort((x, y) => x.id.localeCompare(y.id));

  return { nodes, edges, hiddenCount: graph.concepts.length - nodes.length };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface LayoutLink {
  a: string;
  b: string;
  weight: number;
}

/** Physics links: co-mention plus typed relations (same network the analytics use). */
export function layoutLinks(graph: ConceptGraph, nodeIds: ReadonlySet<string>): LayoutLink[] {
  return buildConceptNetwork(graph)
    .edges()
    .filter(([a, b]) => nodeIds.has(a) && nodeIds.has(b))
    .map(([a, b, weight]) => ({ a, b, weight }));
}

const SPACING = 150;
const ITERATIONS = 300;
/** Room for the label under each bubble. */
const LABEL_CLEARANCE = 56;

/**
 * Deterministic force-directed layout (Fruchterman–Reingold with a pull toward
 * each concept's community centre, then an overlap-removal pass). Returns the
 * CENTRE of each bubble. No randomness: initial positions come from community
 * and sorted index, so a graph always lays out the same way.
 */
export function layoutConceptMap(
  nodes: ReadonlyArray<Pick<ConceptMapNode, 'id' | 'radius' | 'communityId'>>,
  links: readonly LayoutLink[],
): Record<string, { x: number; y: number }> {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const n = sorted.length;
  if (n === 0) return {};
  if (n === 1) return { [sorted[0]!.id]: { x: 0, y: 0 } };

  const index = new Map(sorted.map((node, i) => [node.id, i]));
  const communities = [...new Set(sorted.map((node) => node.communityId))].sort((a, b) => a - b);
  const ringRadius = communities.length === 1 ? 0 : SPACING * Math.max(1.4, Math.sqrt(n) * 0.4);
  const centre = new Map<number, { x: number; y: number }>();
  // Clusters sit on a wide ellipse (screens are landscape), starting on the left.
  communities.forEach((c, i) => {
    const angle = Math.PI + (2 * Math.PI * i) / communities.length;
    centre.set(c, { x: 1.6 * ringRadius * Math.cos(angle), y: 0.7 * ringRadius * Math.sin(angle) });
  });

  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (const c of communities) {
    const members = sorted.filter((node) => node.communityId === c);
    const r = SPACING * 0.45 * Math.sqrt(members.length);
    members.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / members.length + c;
      const at = index.get(node.id)!;
      xs[at] = centre.get(c)!.x + r * Math.cos(angle);
      ys[at] = centre.get(c)!.y + r * Math.sin(angle);
    });
  }

  const linkIdx = links
    .filter((l) => index.has(l.a) && index.has(l.b))
    .map((l) => ({ i: index.get(l.a)!, j: index.get(l.b)!, w: Math.min(2, Math.max(0.3, l.weight)) }));
  const home = sorted.map((node) => centre.get(node.communityId)!);
  const k = SPACING;
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);

  for (let step = 0; step < ITERATIONS; step += 1) {
    dx.fill(0);
    dy.fill(0);
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        let ex = xs[i]! - xs[j]!;
        let ey = ys[i]! - ys[j]!;
        let d = Math.hypot(ex, ey);
        if (d < 0.01) {
          ex = ((i - j) % 3) + 0.5;
          ey = ((i + j) % 3) - 1;
          d = Math.hypot(ex, ey);
        }
        const f = (k * k) / d;
        dx[i]! += (ex / d) * f;
        dy[i]! += (ey / d) * f;
        dx[j]! -= (ex / d) * f;
        dy[j]! -= (ey / d) * f;
      }
    }
    for (const { i, j, w } of linkIdx) {
      const ex = xs[i]! - xs[j]!;
      const ey = ys[i]! - ys[j]!;
      const d = Math.max(0.01, Math.hypot(ex, ey));
      const f = ((d * d) / k) * w;
      dx[i]! -= (ex / d) * f;
      dy[i]! -= (ey / d) * f;
      dx[j]! += (ex / d) * f;
      dy[j]! += (ey / d) * f;
    }
    for (let i = 0; i < n; i += 1) {
      // Pull toward the cluster centre, plus a gravity that is weaker sideways
      // than vertically so the whole map spreads out horizontally.
      dx[i]! += (home[i]!.x - xs[i]!) * 0.2 - xs[i]! * 0.02;
      dy[i]! += (home[i]!.y - ys[i]!) * 0.2 - ys[i]! * 0.08;
    }
    const temperature = k * (1 - step / ITERATIONS) + 1;
    for (let i = 0; i < n; i += 1) {
      const d = Math.hypot(dx[i]!, dy[i]!);
      if (d === 0) continue;
      const move = Math.min(d, temperature);
      xs[i]! += (dx[i]! / d) * move;
      ys[i]! += (dy[i]! / d) * move;
    }
  }

  // Overlap removal: keep bubbles (plus their labels) apart.
  for (let pass = 0; pass < 60; pass += 1) {
    let moved = false;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const min = sorted[i]!.radius + sorted[j]!.radius + LABEL_CLEARANCE;
        let ex = xs[j]! - xs[i]!;
        let ey = ys[j]! - ys[i]!;
        let d = Math.hypot(ex, ey);
        if (d >= min) continue;
        if (d < 0.01) {
          ex = 1;
          ey = 0;
          d = 1;
        }
        const push = (min - d) / 2;
        xs[i]! -= (ex / d) * push;
        ys[i]! -= (ey / d) * push;
        xs[j]! += (ex / d) * push;
        ys[j]! += (ey / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }

  const out: Record<string, { x: number; y: number }> = {};
  sorted.forEach((node, i) => {
    out[node.id] = { x: Math.round(xs[i]!), y: Math.round(ys[i]!) };
  });
  return out;
}

/** Concepts directly related to `conceptId` (either direction), for highlighting. */
export function neighbourIds(edges: readonly ConceptMapEdge[], conceptId: string): Set<string> {
  const out = new Set<string>();
  for (const e of edges) {
    if (e.source === conceptId) out.add(e.target);
    if (e.target === conceptId) out.add(e.source);
  }
  return out;
}
