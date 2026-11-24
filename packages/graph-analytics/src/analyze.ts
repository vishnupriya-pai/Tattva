import type { ConceptGraph, QuestionNode } from '@tattva/contracts';
import { UndirectedGraph, pairKey } from './graph';
import { louvain, modularity } from './communities';
import { betweenness, pageRank } from './centrality';
import { bridgesAndArticulationPoints } from './structure';
import { adamicAdar, type PredictedLink } from './linkPrediction';
import { topologicalOrder, type DirectedEdge } from './prerequisites';
import { computeMastery, type ConceptMastery, type MasteryMention } from './mastery';

export type AnalyticsNode = Pick<
  QuestionNode,
  'id' | 'parentNodeId' | 'userQuestion' | 'isTrap' | 'trapResolvedAt' | 'createdAt'
> & {
  followUps: ReadonlyArray<
    Pick<QuestionNode['followUps'][number], 'id' | 'questionText' | 'isSelected' | 'childNodeId'>
  >;
};

/**
 * Concept–concept network: co-mention in the same question (weight = the
 * smaller of the two mention weights) plus typed relations (weight =
 * confidence). Every concept is a vertex even when isolated.
 */
export function buildConceptNetwork(graph: ConceptGraph): UndirectedGraph {
  const network = new UndirectedGraph();
  for (const c of graph.concepts) network.addNode(c.id);
  const byQuestion = new Map<string, Array<{ conceptId: string; weight: number }>>();
  for (const link of graph.nodeConcepts) {
    const list = byQuestion.get(link.questionNodeId) ?? [];
    list.push({ conceptId: link.conceptId, weight: link.weight });
    byQuestion.set(link.questionNodeId, list);
  }
  for (const list of byQuestion.values()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        network.addEdge(
          list[i]!.conceptId,
          list[j]!.conceptId,
          Math.min(list[i]!.weight, list[j]!.weight),
        );
      }
    }
  }
  for (const edge of graph.conceptEdges)
    network.addEdge(edge.sourceConceptId, edge.targetConceptId, edge.confidence);
  return network;
}

export interface RelatedQuestions {
  questionA: string;
  questionB: string;
  score: number;
  sharedConceptIds: string[];
}

function ancestorsOf(nodes: readonly AnalyticsNode[]): Map<string, Set<string>> {
  const parent = new Map(nodes.map((n) => [n.id, n.parentNodeId]));
  const out = new Map<string, Set<string>>();
  for (const n of nodes) {
    const set = new Set<string>();
    let cur = n.parentNodeId;
    while (cur && !set.has(cur) && set.size < 100) {
      set.add(cur);
      cur = parent.get(cur) ?? null;
    }
    out.set(n.id, set);
  }
  return out;
}

/**
 * Bipartite projection question×concept → question–question, restricted to
 * pairs on DIFFERENT branches (neither is an ancestor of the other): those are
 * the links the tree cannot show. Score is an IDF-weighted overlap: a shared
 * concept mentioned by only two questions counts more than one mentioned by all.
 */
export function relatedQuestions(
  nodes: readonly AnalyticsNode[],
  graph: ConceptGraph,
  options: { topK?: number; minScore?: number } = {},
): RelatedQuestions[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const mentions = new Map<string, Map<string, number>>(); // concept -> question -> weight
  for (const link of graph.nodeConcepts) {
    if (!nodeIds.has(link.questionNodeId)) continue;
    const m = mentions.get(link.conceptId) ?? new Map<string, number>();
    m.set(link.questionNodeId, link.weight);
    mentions.set(link.conceptId, m);
  }
  const ancestors = ancestorsOf(nodes);
  const pairs = new Map<string, RelatedQuestions>();
  for (const [conceptId, byQuestion] of [...mentions].sort(([a], [b]) => a.localeCompare(b))) {
    if (byQuestion.size < 2) continue;
    const idf = 1 / Math.log(1 + byQuestion.size);
    const qs = [...byQuestion.keys()].sort();
    for (let i = 0; i < qs.length; i += 1) {
      for (let j = i + 1; j < qs.length; j += 1) {
        const a = qs[i]!;
        const b = qs[j]!;
        if (ancestors.get(a)?.has(b) || ancestors.get(b)?.has(a)) continue;
        const key = pairKey(a, b);
        const entry = pairs.get(key) ?? {
          questionA: a,
          questionB: b,
          score: 0,
          sharedConceptIds: [],
        };
        entry.score += Math.min(byQuestion.get(a)!, byQuestion.get(b)!) * idf;
        entry.sharedConceptIds.push(conceptId);
        pairs.set(key, entry);
      }
    }
  }
  return [...pairs.values()]
    .filter((p) => p.score >= (options.minScore ?? 0))
    .map((p) => ({ ...p, score: Math.round(p.score * 1000) / 1000 }))
    .sort(
      (x, y) =>
        y.score - x.score ||
        x.questionA.localeCompare(y.questionA) ||
        x.questionB.localeCompare(y.questionB),
    )
    .slice(0, options.topK ?? 20);
}

export interface FrontierItem {
  nodeId: string;
  followUpId: string;
  questionText: string;
  /** The parent has an unresolved trap, so this thread is locked until it is resolved. */
  blockedByTrap: boolean;
}

export interface PrerequisiteGap {
  prerequisiteConceptId: string;
  dependentConceptId: string;
}

export interface ConceptInsight {
  id: string;
  name: string;
  communityId: number;
  pageRank: number;
  betweenness: number;
  isKeystone: boolean;
  isArticulationPoint: boolean;
  mentionCount: number;
  mastery: ConceptMastery;
}

export interface Community {
  id: number;
  /** Name of the member with the highest PageRank. */
  label: string;
  conceptIds: string[];
}

export interface NodeInsight {
  /** Mentioned concepts, heaviest first. */
  conceptIds: string[];
  primaryConceptId: string | null;
  communityId: number | null;
  /** Mean mastery of mentioned concepts; null when the node has none. */
  meanMastery: number | null;
}

export interface KnowledgeGraphAnalysis {
  concepts: Record<string, ConceptInsight>;
  communities: Community[];
  modularity: number;
  keystoneConceptIds: string[];
  relatedQuestions: RelatedQuestions[];
  predictedLinks: PredictedLink[];
  bridges: Array<[string, string]>;
  articulationConceptIds: string[];
  prerequisiteOrder: string[];
  prerequisiteCycleConceptIds: string[];
  prerequisiteGaps: PrerequisiteGap[];
  frontier: FrontierItem[];
  coverage: {
    exploredFollowUps: number;
    totalFollowUps: number;
    conceptCount: number;
    masteredCount: number;
    misconceptionCount: number;
    meanMastery: number;
  };
  nodes: Record<string, NodeInsight>;
}

const KEYSTONE_LIMIT = 3;

export function prerequisiteEdgesOf(graph: ConceptGraph): DirectedEdge[] {
  return graph.conceptEdges
    .filter((e) => e.relationType === 'PREREQUISITE_OF')
    .map((e) => ({ from: e.sourceConceptId, to: e.targetConceptId }));
}

/**
 * One pass over the whole Knowledge Map. Pure and deterministic; cheap enough
 * to recompute on every graph change for hackathon-scale inquiries (tens of
 * nodes, low hundreds of concepts — betweenness is O(V·E)).
 */
export function analyzeKnowledgeGraph(
  nodes: readonly AnalyticsNode[],
  graph: ConceptGraph,
  options: { excludedPredictionPairs?: ReadonlySet<string>; predictionLimit?: number } = {},
): KnowledgeGraphAnalysis {
  const network = buildConceptNetwork(graph);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const conceptById = new Map(graph.concepts.map((c) => [c.id, c]));

  const root = nodes.find((n) => n.parentNodeId === null);
  const rootConcepts = graph.nodeConcepts
    .filter((l) => l.questionNodeId === root?.id)
    .map((l) => l.conceptId);
  const pr = pageRank(network, { personalization: rootConcepts });
  const bc = betweenness(network);
  const partition = louvain(network);
  const { bridges, articulationPoints } = bridgesAndArticulationPoints(network);
  const articulation = new Set(articulationPoints);

  const keystoneConceptIds = [...bc]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, KEYSTONE_LIMIT)
    .map(([id]) => id);
  const keystones = new Set(keystoneConceptIds);

  const prerequisiteEdges = prerequisiteEdgesOf(graph);
  const mentions: MasteryMention[] = [];
  const mentionCount = new Map<string, number>();
  for (const link of graph.nodeConcepts) {
    const node = nodeById.get(link.questionNodeId);
    if (!node) continue;
    mentionCount.set(link.conceptId, (mentionCount.get(link.conceptId) ?? 0) + 1);
    mentions.push({
      conceptId: link.conceptId,
      role: link.role,
      weight: link.weight,
      trap: !node.isTrap ? 'none' : node.trapResolvedAt ? 'resolved' : 'unresolved',
    });
  }
  const mastery = computeMastery(conceptById.keys(), mentions, prerequisiteEdges);

  const concepts: Record<string, ConceptInsight> = {};
  for (const c of graph.concepts) {
    concepts[c.id] = {
      id: c.id,
      name: c.name,
      communityId: partition.get(c.id) ?? 0,
      pageRank: Math.round((pr.get(c.id) ?? 0) * 10000) / 10000,
      betweenness: Math.round((bc.get(c.id) ?? 0) * 10000) / 10000,
      isKeystone: keystones.has(c.id),
      isArticulationPoint: articulation.has(c.id),
      mentionCount: mentionCount.get(c.id) ?? 0,
      mastery: mastery.get(c.id)!,
    };
  }

  const communityMembers = new Map<number, string[]>();
  for (const [id, c] of partition)
    communityMembers.set(c, [...(communityMembers.get(c) ?? []), id]);
  const communities: Community[] = [...communityMembers]
    .sort(([a], [b]) => a - b)
    .map(([id, members]) => {
      const lead = members
        .slice()
        .sort((a, b) => (pr.get(b) ?? 0) - (pr.get(a) ?? 0) || a.localeCompare(b))[0]!;
      return { id, label: conceptById.get(lead)?.name ?? lead, conceptIds: members.sort() };
    });

  const { order, cyclic } = topologicalOrder(conceptById.keys(), prerequisiteEdges);
  const definedConcepts = new Set(
    graph.nodeConcepts
      .filter((l) => l.role === 'defines' && nodeById.has(l.questionNodeId))
      .map((l) => l.conceptId),
  );
  const prerequisiteGaps: PrerequisiteGap[] = prerequisiteEdges
    .filter(
      (e) =>
        definedConcepts.has(e.to) &&
        !definedConcepts.has(e.from) &&
        mastery.get(e.from)?.status !== 'mastered',
    )
    .map((e) => ({ prerequisiteConceptId: e.from, dependentConceptId: e.to }));

  const frontier: FrontierItem[] = [];
  let exploredFollowUps = 0;
  let totalFollowUps = 0;
  for (const node of nodes) {
    for (const f of node.followUps) {
      totalFollowUps += 1;
      if (f.isSelected || f.childNodeId) exploredFollowUps += 1;
      else
        frontier.push({
          nodeId: node.id,
          followUpId: f.id,
          questionText: f.questionText,
          blockedByTrap: node.isTrap && !node.trapResolvedAt,
        });
    }
  }

  const nodeInsights: Record<string, NodeInsight> = {};
  for (const node of nodes) {
    const links = graph.nodeConcepts
      .filter((l) => l.questionNodeId === node.id && conceptById.has(l.conceptId))
      .sort((a, b) => b.weight - a.weight || a.conceptId.localeCompare(b.conceptId));
    const primary = links[0]?.conceptId ?? null;
    nodeInsights[node.id] = {
      conceptIds: links.map((l) => l.conceptId),
      primaryConceptId: primary,
      communityId: primary ? (partition.get(primary) ?? null) : null,
      meanMastery: links.length
        ? links.reduce((s, l) => s + mastery.get(l.conceptId)!.score, 0) / links.length
        : null,
    };
  }

  const scores = [...mastery.values()];
  return {
    concepts,
    communities,
    modularity: Math.round(modularity(network, partition) * 1000) / 1000,
    keystoneConceptIds,
    relatedQuestions: relatedQuestions(nodes, graph, { minScore: 0.1 }),
    predictedLinks: adamicAdar(network, {
      topK: options.predictionLimit ?? 10,
      exclude: options.excludedPredictionPairs,
    }),
    bridges,
    articulationConceptIds: articulationPoints,
    prerequisiteOrder: order,
    prerequisiteCycleConceptIds: cyclic,
    prerequisiteGaps,
    frontier,
    coverage: {
      exploredFollowUps,
      totalFollowUps,
      conceptCount: graph.concepts.length,
      masteredCount: scores.filter((m) => m.status === 'mastered').length,
      misconceptionCount: scores.filter((m) => m.status === 'misconception').length,
      meanMastery: scores.length
        ? Math.round((scores.reduce((s, m) => s + m.score, 0) / scores.length) * 1000) / 1000
        : 0,
    },
    nodes: nodeInsights,
  };
}
