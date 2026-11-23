import { describe, expect, it } from 'vitest';
import type { ConceptGraph } from '@tattva/contracts';
import {
  analyzeKnowledgeGraph,
  buildConceptNetwork,
  relatedQuestions,
  type AnalyticsNode,
} from './index';

/**
 * root
 * ├─ a  (arena branch)      ── a2
 * └─ b  (free-list branch)  — trap, unresolved
 */
function node(
  id: string,
  parentNodeId: string | null,
  extra: Partial<AnalyticsNode> = {},
): AnalyticsNode {
  return {
    id,
    parentNodeId,
    userQuestion: `Q ${id}`,
    isTrap: false,
    trapResolvedAt: null,
    createdAt: id,
    followUps: [
      { id: `${id}-f1`, questionText: `${id} follow 1`, isSelected: false, childNodeId: null },
      { id: `${id}-f2`, questionText: `${id} follow 2`, isSelected: false, childNodeId: null },
    ],
    ...extra,
  };
}

const NODES: AnalyticsNode[] = [
  node('root', null, {
    followUps: [
      { id: 'root-f1', questionText: 'a', isSelected: true, childNodeId: 'a' },
      { id: 'root-f2', questionText: 'b', isSelected: true, childNodeId: 'b' },
    ],
  }),
  node('a', 'root'),
  node('b', 'root', { isTrap: true }),
  node('a2', 'a'),
];

function concept(id: string, name: string) {
  return { id, name, slug: id, aliases: [], createdAt: '0' };
}

const GRAPH: ConceptGraph = {
  concepts: [
    concept('bump', 'Bump Pointer'),
    concept('meta', 'Per-Object Metadata'),
    concept('life', 'Object Lifetime'),
    concept('free', 'Free List'),
    concept('frag', 'Fragmentation'),
  ],
  nodeConcepts: [
    { questionNodeId: 'root', conceptId: 'bump', role: 'defines', weight: 0.9 },
    { questionNodeId: 'root', conceptId: 'life', role: 'uses', weight: 0.5 },
    { questionNodeId: 'a', conceptId: 'meta', role: 'defines', weight: 0.8 },
    { questionNodeId: 'a', conceptId: 'bump', role: 'uses', weight: 0.4 },
    { questionNodeId: 'a2', conceptId: 'life', role: 'defines', weight: 0.7 },
    { questionNodeId: 'b', conceptId: 'free', role: 'defines', weight: 0.9 },
    { questionNodeId: 'b', conceptId: 'meta', role: 'misconceives', weight: 0.6 },
    { questionNodeId: 'b', conceptId: 'frag', role: 'uses', weight: 0.5 },
  ],
  conceptEdges: [
    {
      id: 'e1',
      sourceConceptId: 'meta',
      targetConceptId: 'free',
      relationType: 'PREREQUISITE_OF',
      justification: '',
      origin: 'model',
      confidence: 0.6,
      sourceNodeId: 'b',
      createdAt: '0',
    },
    {
      id: 'e2',
      sourceConceptId: 'life',
      targetConceptId: 'bump',
      relationType: 'PREREQUISITE_OF',
      justification: '',
      origin: 'model',
      confidence: 0.6,
      sourceNodeId: 'a2',
      createdAt: '0',
    },
  ],
};

describe('buildConceptNetwork', () => {
  it('connects co-mentioned concepts and typed relations, keeping isolated concepts', () => {
    const network = buildConceptNetwork(GRAPH);
    expect(network.weight('bump', 'life')).toBeCloseTo(0.5 + 0.6, 8); // co-mention in root + prerequisite edge
    expect(network.weight('meta', 'free')).toBeCloseTo(0.6 + 0.6, 8);
    expect(network.hasEdge('bump', 'free')).toBe(false);
    expect(network.size).toBe(5);
  });
});

describe('relatedQuestions', () => {
  it('links questions on different branches through shared concepts, never ancestor pairs', () => {
    const related = relatedQuestions(NODES, GRAPH);
    // a2 and root share "life" but root is a2's ancestor → excluded.
    // a and b share "meta" across branches → included.
    expect(related).toEqual([
      {
        questionA: 'a',
        questionB: 'b',
        score: expect.closeTo(0.6 / Math.log(3), 3),
        sharedConceptIds: ['meta'],
      },
    ]);
  });
});

describe('analyzeKnowledgeGraph', () => {
  const analysis = analyzeKnowledgeGraph(NODES, GRAPH);

  it('turns trap evidence into misconception status and flags the concept', () => {
    expect(analysis.concepts.meta!.mastery.status).toBe('misconception');
    expect(analysis.concepts.free!.mastery.status).toBe('misconception');
    expect(analysis.coverage.misconceptionCount).toBe(3); // free, meta, frag all mentioned by the unresolved trap node
  });

  it('identifies the bridging concept as keystone and articulation point', () => {
    expect(analysis.keystoneConceptIds[0]).toBe('meta');
    expect(analysis.articulationConceptIds).toContain('meta');
    expect(analysis.bridges).toContainEqual(['bump', 'meta']);
  });

  it('separates the two branches into communities labelled by their most central concept', () => {
    const byConcept = (id: string) => analysis.concepts[id]!.communityId;
    expect(byConcept('free')).toBe(byConcept('frag'));
    expect(byConcept('bump')).toBe(byConcept('life'));
    expect(byConcept('bump')).not.toBe(byConcept('free'));
    expect(analysis.communities.every((c) => c.label.length > 0)).toBe(true);
  });

  it('proposes hidden links between unconnected concepts', () => {
    expect(analysis.predictedLinks.length).toBeGreaterThan(0);
    for (const link of analysis.predictedLinks) {
      expect(buildConceptNetwork(GRAPH).hasEdge(link.sourceConceptId, link.targetConceptId)).toBe(
        false,
      );
    }
  });

  it('reports prerequisite gaps: a defined concept whose prerequisite was never studied directly', () => {
    // free is defined (b) but its prerequisite meta is only defined in a → no gap;
    // bump is defined (root) and its prerequisite life is defined (a2) → no gap.
    expect(analysis.prerequisiteGaps).toEqual([]);
    const without = analyzeKnowledgeGraph(
      NODES.filter((n) => n.id !== 'a2'),
      GRAPH,
    );
    expect(without.prerequisiteGaps).toEqual([
      { prerequisiteConceptId: 'life', dependentConceptId: 'bump' },
    ]);
  });

  it('lists open follow-ups as the frontier and marks trap-locked ones', () => {
    expect(analysis.coverage).toMatchObject({
      exploredFollowUps: 2,
      totalFollowUps: 8,
      conceptCount: 5,
    });
    expect(analysis.frontier).toHaveLength(6);
    expect(analysis.frontier.filter((f) => f.blockedByTrap).map((f) => f.followUpId)).toEqual([
      'b-f1',
      'b-f2',
    ]);
  });

  it('summarizes each node by its heaviest concept', () => {
    expect(analysis.nodes.root).toMatchObject({
      primaryConceptId: 'bump',
      conceptIds: ['bump', 'life'],
    });
    expect(analysis.nodes.b!.primaryConceptId).toBe('free');
  });

  it('copes with an empty inquiry', () => {
    const empty = analyzeKnowledgeGraph([], { concepts: [], nodeConcepts: [], conceptEdges: [] });
    expect(empty.communities).toEqual([]);
    expect(empty.coverage.meanMastery).toBe(0);
  });
});
