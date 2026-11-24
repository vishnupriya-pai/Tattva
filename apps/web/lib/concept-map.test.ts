import { describe, expect, it } from 'vitest';
import type { ConceptEdge, ConceptGraph } from '@tattva/contracts';
import { analyzeKnowledgeGraph } from '@tattva/graph-analytics';
import {
  buildConceptMap,
  CLUTTER_THRESHOLD,
  conceptRadius,
  layoutConceptMap,
  layoutLinks,
  neighbourIds,
} from './concept-map';
import type { QuestionNode } from './workspace-types';

function question(id: string, parentNodeId: string | null): QuestionNode {
  return {
    id,
    parentNodeId,
    userQuestion: id,
    aiExplanation: '',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: [],
    createdAt: id,
  } as unknown as QuestionNode;
}

function concept(id: string) {
  return { id, name: id.toUpperCase(), slug: id, aliases: [], createdAt: '0' };
}

function edge(id: string, from: string, to: string, extra: Partial<ConceptEdge> = {}): ConceptEdge {
  return {
    id,
    sourceConceptId: from,
    targetConceptId: to,
    relationType: 'CAUSES',
    justification: 'because',
    origin: 'model',
    confidence: 0.6,
    sourceNodeId: null,
    createdAt: '0',
    ...extra,
  };
}

/** Two branches (q1→q2, q1→q3) that share concept "b" — the cross-branch link the tree hides. */
const NODES = [question('q1', null), question('q2', 'q1'), question('q3', 'q1')];
const GRAPH: ConceptGraph = {
  concepts: ['a', 'b', 'c', 'd'].map(concept),
  nodeConcepts: [
    { questionNodeId: 'q1', conceptId: 'a', role: 'defines', weight: 0.9 },
    { questionNodeId: 'q2', conceptId: 'b', role: 'defines', weight: 0.8 },
    { questionNodeId: 'q3', conceptId: 'b', role: 'uses', weight: 0.4 },
    { questionNodeId: 'q3', conceptId: 'c', role: 'defines', weight: 0.9 },
    { questionNodeId: 'q2', conceptId: 'd', role: 'uses', weight: 0.5 },
  ],
  conceptEdges: [
    edge('e1', 'a', 'b', { relationType: 'PREREQUISITE_OF' }),
    edge('e2', 'b', 'c', { relationType: 'TRADES_OFF_WITH' }),
    edge('e3', 'c', 'b', { relationType: 'TRADES_OFF_WITH' }),
    edge('e4', 'c', 'd', { confidence: 0.3 }),
  ],
};

describe('buildConceptMap', () => {
  const model = buildConceptMap(GRAPH, analyzeKnowledgeGraph(NODES, GRAPH));

  it('draws one vertex per concept, sized by mentions, listing the questions that explain it', () => {
    expect(model.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd']);
    const b = model.nodes.find((n) => n.id === 'b')!;
    expect(b.mentionCount).toBe(2);
    expect(b.radius).toBe(conceptRadius(2));
    expect(b.questionIds).toEqual(['q2', 'q3']);
  });

  it('keeps typed relations, drops low-confidence ones and symmetric duplicates', () => {
    expect(model.edges.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(model.edges[0]).toMatchObject({ directed: true, label: 'needed for' });
    expect(model.edges[1]).toMatchObject({ directed: false, label: 'trades off with' });
  });

  it('hides single-mention, unrelated concepts only when the map is crowded', () => {
    const many = Array.from({ length: CLUTTER_THRESHOLD + 1 }, (_, i) => concept(`x${i}`));
    const crowded: ConceptGraph = {
      concepts: [...GRAPH.concepts, ...many],
      nodeConcepts: [
        ...GRAPH.nodeConcepts,
        ...many.map((c) => ({ questionNodeId: 'q1', conceptId: c.id, role: 'uses' as const, weight: 0.2 })),
      ],
      conceptEdges: GRAPH.conceptEdges,
    };
    const crowdedModel = buildConceptMap(crowded, analyzeKnowledgeGraph(NODES, crowded));
    expect(crowdedModel.hiddenCount).toBe(many.length + 1); // the x-concepts and "d" (its only edge is too weak)
    expect(crowdedModel.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
  });

  it('finds neighbours in both directions', () => {
    expect([...neighbourIds(model.edges, 'b')].sort()).toEqual(['a', 'c']);
  });
});

describe('layoutConceptMap', () => {
  const model = buildConceptMap(GRAPH, analyzeKnowledgeGraph(NODES, GRAPH));
  const links = layoutLinks(GRAPH, new Set(model.nodes.map((n) => n.id)));

  it('is deterministic', () => {
    expect(layoutConceptMap(model.nodes, links)).toEqual(layoutConceptMap(model.nodes, links));
  });

  it('never overlaps bubbles', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, radius: 24, communityId: i % 3 }));
    const ring = many.map((n, i) => ({ a: n.id, b: many[(i + 1) % many.length]!.id, weight: 1 }));
    const pos = layoutConceptMap(many, ring);
    for (let i = 0; i < many.length; i += 1) {
      for (let j = i + 1; j < many.length; j += 1) {
        const p = pos[many[i]!.id]!;
        const q = pos[many[j]!.id]!;
        expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(48);
      }
    }
  });

  it('handles empty and single-concept maps', () => {
    expect(layoutConceptMap([], [])).toEqual({});
    expect(layoutConceptMap([{ id: 'a', radius: 16, communityId: 0 }], [])).toEqual({ a: { x: 0, y: 0 } });
  });
});
