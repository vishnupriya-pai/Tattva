import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConceptGraph } from '@tattva/contracts';

const { findInquiryByIdForUser } = vi.hoisted(() => ({ findInquiryByIdForUser: vi.fn() }));
const repo = vi.hoisted(() => ({
  listConceptGraphForInquiry: vi.fn(),
  listRejectedConceptPairs: vi.fn(),
  addPredictedEdges: vi.fn(),
}));
const { verifyConceptLinks } = vi.hoisted(() => ({ verifyConceptLinks: vi.fn() }));

vi.mock('../repositories/inquiryRepository', () => ({ findInquiryByIdForUser }));
vi.mock('../repositories/conceptGraphRepository', () => repo);
vi.mock('../integrations/sarvam/client', () => ({ verifyConceptLinks }));
vi.mock('../integrations/supabase/client', () => ({
  createRequestScopedClient: () => ({}),
  getAdminClient: () => ({ admin: true }),
  isSupabaseAdminConfigured: () => true,
}));

import {
  discoverConnectionsForUser,
  parseLinkVerdicts,
  planPredictedEdges,
} from './connectionDiscoveryService';

function concept(id: string, name = id) {
  return { id, name, slug: id, aliases: [], createdAt: '0' };
}

/** a and c are both co-mentioned with hub b (q1: a,b; q2: b,c) but not with each other. */
const GRAPH: ConceptGraph = {
  concepts: [
    concept('a', 'Bump Pointer'),
    concept('b', 'Per-Object Metadata'),
    concept('c', 'Free List'),
  ],
  nodeConcepts: [
    { questionNodeId: 'q1', conceptId: 'a', role: 'defines', weight: 0.8 },
    { questionNodeId: 'q1', conceptId: 'b', role: 'uses', weight: 0.6 },
    { questionNodeId: 'q2', conceptId: 'b', role: 'uses', weight: 0.6 },
    { questionNodeId: 'q2', conceptId: 'c', role: 'defines', weight: 0.9 },
  ],
  conceptEdges: [],
};

describe('parseLinkVerdicts', () => {
  it('defaults every pair to rejected and accepts only complete, confident verdicts', () => {
    const verdicts = parseLinkVerdicts(
      {
        verdicts: [
          {
            pair: 1,
            valid: true,
            from: 'B',
            type: 'trades off with',
            why: ' Real reason. ',
            confidence: 0.8,
          },
          { pair: 2, valid: true, from: 'A', type: 'RELATED', why: 'x', confidence: 0.9 },
          { pair: 3, valid: true, from: 'A', type: 'CAUSES', why: 'x', confidence: 0.3 },
          { pair: 4, valid: true, from: 'C', type: 'CAUSES', why: 'x', confidence: 0.9 },
          { pair: 1, valid: false },
          { pair: 9, valid: true, from: 'A', type: 'CAUSES', why: 'x', confidence: 1 },
          'junk',
        ],
      },
      5,
    );
    expect(verdicts[0]).toEqual({
      pairIndex: 0,
      valid: true,
      edge: { from: 'B', type: 'TRADES_OFF_WITH', justification: 'Real reason.', confidence: 0.8 },
    });
    expect(verdicts.slice(1).every((v) => !v.valid)).toBe(true);
    expect(verdicts).toHaveLength(5);
  });

  it('rejects everything when the payload is not usable', () => {
    expect(parseLinkVerdicts(null, 2).map((v) => v.valid)).toEqual([false, false]);
  });
});

describe('planPredictedEdges', () => {
  const pairs = [
    { a: 'a', b: 'c' },
    { a: 'a', b: 'b' },
  ];

  it('orients accepted edges by "from" and records rejections', () => {
    const plan = planPredictedEdges(
      pairs,
      [
        {
          pairIndex: 0,
          valid: true,
          edge: { from: 'B', type: 'CONTRASTS_WITH', justification: 'w', confidence: 0.7 },
        },
        { pairIndex: 1, valid: false },
      ],
      GRAPH,
    );
    expect(plan.edges).toEqual([
      {
        sourceConceptId: 'c',
        targetConceptId: 'a',
        type: 'CONTRASTS_WITH',
        justification: 'w',
        confidence: 0.7,
      },
    ]);
    expect(plan.rejected).toEqual([{ a: 'a', b: 'b' }]);
  });

  it('turns a prerequisite that would create a cycle into a rejection', () => {
    const withEdge: ConceptGraph = {
      ...GRAPH,
      conceptEdges: [
        {
          id: 'e',
          sourceConceptId: 'a',
          targetConceptId: 'c',
          relationType: 'PREREQUISITE_OF',
          justification: '',
          origin: 'model',
          confidence: 0.6,
          sourceNodeId: null,
          createdAt: '0',
        },
      ],
    };
    const plan = planPredictedEdges(
      [{ a: 'c', b: 'a' }],
      [
        {
          pairIndex: 0,
          valid: true,
          edge: { from: 'A', type: 'PREREQUISITE_OF', justification: 'w', confidence: 0.9 },
        },
      ],
      withEdge,
    );
    expect(plan.edges).toEqual([]);
    expect(plan.rejected).toEqual([{ a: 'c', b: 'a' }]);
  });
});

describe('discoverConnectionsForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findInquiryByIdForUser.mockResolvedValue({ id: 'inq', userId: 'u', title: 'Memory Arenas' });
    repo.listRejectedConceptPairs.mockResolvedValue(new Set());
    repo.addPredictedEdges.mockResolvedValue(1);
  });

  it('404s for an inquiry the caller does not own', async () => {
    findInquiryByIdForUser.mockResolvedValue(null);
    await expect(discoverConnectionsForUser('t', 'u', 'inq')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('does not call Sarvam when the graph offers no candidates', async () => {
    repo.listConceptGraphForInquiry.mockResolvedValue({
      concepts: [],
      nodeConcepts: [],
      conceptEdges: [],
    });
    await expect(discoverConnectionsForUser('t', 'u', 'inq')).resolves.toEqual({
      added: [],
      rejectedCount: 0,
      consideredCount: 0,
    });
    expect(verifyConceptLinks).not.toHaveBeenCalled();
  });

  it('verifies the predicted pair by name, stores it, and returns the stored edge', async () => {
    const stored = {
      id: 'new',
      sourceConceptId: 'a',
      targetConceptId: 'c',
      relationType: 'TRADES_OFF_WITH',
      justification: 'w',
      origin: 'predicted',
      confidence: 0.7,
      sourceNodeId: null,
      createdAt: '1',
    };
    repo.listConceptGraphForInquiry
      .mockResolvedValueOnce(GRAPH)
      .mockResolvedValueOnce({ ...GRAPH, conceptEdges: [stored] });
    verifyConceptLinks.mockResolvedValue({
      verdicts: [
        { pair: 1, valid: true, from: 'A', type: 'TRADES_OFF_WITH', why: 'w', confidence: 0.9 },
      ],
    });

    const result = await discoverConnectionsForUser('t', 'u', 'inq');

    expect(verifyConceptLinks).toHaveBeenCalledWith({
      topic: 'Memory Arenas',
      pairs: [{ a: 'Bump Pointer', b: 'Free List', via: ['Per-Object Metadata'] }],
    });
    expect(repo.addPredictedEdges).toHaveBeenCalledWith(
      { admin: true },
      {
        userId: 'u',
        inquiryId: 'inq',
        rejected: [],
        edges: [
          {
            sourceConceptId: 'a',
            targetConceptId: 'c',
            type: 'TRADES_OFF_WITH',
            justification: 'w',
            confidence: 0.9,
          },
        ],
      },
    );
    expect(result).toEqual({ added: [stored], rejectedCount: 0, consideredCount: 1 });
  });

  it('skips pairs that were rejected before', async () => {
    repo.listConceptGraphForInquiry.mockResolvedValue(GRAPH);
    repo.listRejectedConceptPairs.mockResolvedValue(new Set(['a|c']));
    await expect(discoverConnectionsForUser('t', 'u', 'inq')).resolves.toMatchObject({
      consideredCount: 0,
    });
    expect(verifyConceptLinks).not.toHaveBeenCalled();
  });
});
