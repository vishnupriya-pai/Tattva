import { describe, expect, it } from 'vitest';
import type { ConceptGraph } from '@tattva/contracts';
import { analyzeKnowledgeGraph } from '@tattva/graph-analytics';
import { computeNodeMetrics } from './graph-metrics';
import type { QuestionNode } from './workspace-types';

function node(
  id: string,
  parentNodeId: string | null,
  extra: Partial<QuestionNode> = {},
): QuestionNode {
  return {
    id,
    parentNodeId,
    userQuestion: `Why does ${id} matter in a completely unrelated field like cooking?`,
    aiExplanation: '',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: [],
    createdAt: id,
    ...extra,
  } as QuestionNode;
}

const EMPTY: ConceptGraph = { concepts: [], nodeConcepts: [], conceptEdges: [] };

describe('computeNodeMetrics', () => {
  it('is topic-agnostic: off-allocator questions are never marked divergent', () => {
    const nodes = [node('root', null), node('child', 'root')];
    const metrics = computeNodeMetrics(nodes, analyzeKnowledgeGraph(nodes, EMPTY));
    expect(metrics.get('child')).toMatchObject({ tier: 'initial', depth: 1, mastery: null });
    expect(metrics.get('root')).toMatchObject({ tier: 'moderate', childCount: 1 });
  });

  it('tags a node with its heaviest concept, falling back to a short question', () => {
    const nodes = [node('root', null), node('child', 'root')];
    const graph: ConceptGraph = {
      concepts: [
        { id: 'c1', name: 'Bump Pointer', slug: 'bump-pointer', aliases: [], createdAt: '0' },
      ],
      nodeConcepts: [{ questionNodeId: 'root', conceptId: 'c1', role: 'defines', weight: 0.9 }],
      conceptEdges: [],
    };
    const metrics = computeNodeMetrics(nodes, analyzeKnowledgeGraph(nodes, graph));
    expect(metrics.get('root')!.conceptTag).toBe('Bump Pointer');
    expect(metrics.get('child')!.conceptTag).toBe('Why does child matter…');
  });

  it('marks a survived trap as deep and an explored-only node by mastery', () => {
    const nodes = [node('root', null, { isTrap: true, trapResolvedAt: '2026-11-23T00:00:00Z' })];
    const graph: ConceptGraph = {
      concepts: [
        { id: 'c1', name: 'Arena Reset', slug: 'arena-reset', aliases: [], createdAt: '0' },
      ],
      nodeConcepts: [{ questionNodeId: 'root', conceptId: 'c1', role: 'defines', weight: 1 }],
      conceptEdges: [],
    };
    const metrics = computeNodeMetrics(nodes, analyzeKnowledgeGraph(nodes, graph));
    expect(metrics.get('root')).toMatchObject({ tier: 'deep', mastery: 1 });
  });
});
