import { describe, expect, it, vi, beforeEach } from 'vitest';

const { findLearningSourceById } = vi.hoisted(() => ({ findLearningSourceById: vi.fn() }));
const { createInquiry, findInquiryByIdForUser, listInquiriesForUser } = vi.hoisted(() => ({
  createInquiry: vi.fn(),
  findInquiryByIdForUser: vi.fn(),
  listInquiriesForUser: vi.fn(),
}));
const { listNodesForInquiry, createNodeAtomically } = vi.hoisted(() => ({
  listNodesForInquiry: vi.fn(),
  createNodeAtomically: vi.fn(),
}));
const { listConceptGraphForInquiry, attachNodeConcepts } = vi.hoisted(() => ({
  listConceptGraphForInquiry: vi.fn(),
  attachNodeConcepts: vi.fn(),
}));
const { createRequestScopedClient } = vi.hoisted(() => ({ createRequestScopedClient: vi.fn() }));
const { generateQuestionNode } = vi.hoisted(() => ({ generateQuestionNode: vi.fn() }));

vi.mock('../repositories/learningSourceRepository', () => ({ findLearningSourceById }));
vi.mock('../repositories/inquiryRepository', () => ({
  createInquiry,
  findInquiryByIdForUser,
  listInquiriesForUser,
}));
vi.mock('../repositories/questionNodeRepository', () => ({ listNodesForInquiry, createNodeAtomically }));
vi.mock('../repositories/conceptGraphRepository', () => ({ listConceptGraphForInquiry, attachNodeConcepts }));
vi.mock('../integrations/supabase/client', () => ({
  createRequestScopedClient,
  getAdminClient: () => ({}),
  isSupabaseAdminConfigured: () => true,
}));
vi.mock('../integrations/sarvam/client', () => ({ generateQuestionNode, evaluateTrap: vi.fn() }));

import { createInquiryForUser, createQuestionNodeForUser, getInquiryDetail, listInquiries } from './inquiryService';

const SOURCE = {
  id: 'source-1',
  title: 'Memory Arena Allocators',
  sourceType: 'transcript' as const,
  sourceReference: 'seed/x.txt',
  durationMinutes: 38,
};

const EMPTY_GRAPH = { concepts: [], nodeConcepts: [], conceptEdges: [] };
const NO_CONCEPTS = { concepts: [], relations: [] };

beforeEach(() => {
  vi.clearAllMocks();
  createRequestScopedClient.mockReturnValue({});
  listConceptGraphForInquiry.mockResolvedValue(EMPTY_GRAPH);
  attachNodeConcepts.mockResolvedValue(0);
});

describe('createInquiryForUser', () => {
  it('throws 404 when the learning source does not exist', async () => {
    findLearningSourceById.mockResolvedValue(null);

    await expect(createInquiryForUser('token', 'user-1', 'missing-source')).rejects.toMatchObject({
      statusCode: 404,
      code: 'learning_source_not_found',
    });
    expect(createInquiry).not.toHaveBeenCalled();
  });

  it('creates the inquiry for the verified user when the source exists', async () => {
    findLearningSourceById.mockResolvedValue(SOURCE);
    createInquiry.mockResolvedValue({
      id: 'inq-1',
      userId: 'user-1',
      learningSourceId: SOURCE.id,
      title: null,
      createdAt: 'now',
      updatedAt: 'now',
    });

    const result = await createInquiryForUser('token', 'user-1', SOURCE.id);

    expect(createInquiry).toHaveBeenCalledWith(expect.anything(), 'user-1', SOURCE.id);
    expect(result.userId).toBe('user-1');
  });
});

describe('listInquiries', () => {
  it('scopes the list to the verified caller', async () => {
    listInquiriesForUser.mockResolvedValue([]);

    await listInquiries('token', 'user-1');

    expect(listInquiriesForUser).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });
});

describe('getInquiryDetail', () => {
  it('returns 404 (not 403) when the inquiry does not exist or is not owned by the caller', async () => {
    findInquiryByIdForUser.mockResolvedValue(null);

    await expect(getInquiryDetail('token', 'user-1', 'inq-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'inquiry_not_found',
    });
  });

  it('rejects as 404 even if a repository bug returns a row owned by a different user (defense in depth)', async () => {
    findInquiryByIdForUser.mockResolvedValue({
      id: 'inq-1',
      userId: 'someone-else',
      learningSourceId: SOURCE.id,
      title: null,
      createdAt: 'now',
      updatedAt: 'now',
    });

    await expect(getInquiryDetail('token', 'user-1', 'inq-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'inquiry_not_found',
    });
    expect(listNodesForInquiry).not.toHaveBeenCalled();
  });

  it('assembles the inquiry, its learning source, and its nodes for the owner', async () => {
    findInquiryByIdForUser.mockResolvedValue({
      id: 'inq-1',
      userId: 'user-1',
      learningSourceId: SOURCE.id,
      title: null,
      createdAt: 'now',
      updatedAt: 'now',
    });
    findLearningSourceById.mockResolvedValue(SOURCE);
    listNodesForInquiry.mockResolvedValue([]);

    const detail = await getInquiryDetail('token', 'user-1', 'inq-1');

    expect(detail).toEqual({ id: 'inq-1', learningSource: SOURCE, nodes: [], conceptGraph: EMPTY_GRAPH });
  });
});

describe('createQuestionNodeForUser learning-path context', () => {
  const ROOT_ID = '00000000-0000-4000-8000-000000000001';
  const CHILD_ID = '00000000-0000-4000-8000-000000000002';
  const FOLLOW_UP_ID = '00000000-0000-4000-8000-000000000003';
  const NEW_ID = '00000000-0000-4000-8000-000000000004';

  function storedNode(id: string, parentNodeId: string | null, followUps: unknown[] = []) {
    return {
      id, parentNodeId, userQuestion: `question ${id.slice(-1)}`, aiExplanation: `explanation ${id.slice(-1)}`,
      researchMode: false, isTrap: false, trapMetadata: null, trapResolvedAt: null, followUps, createdAt: 'now',
    };
  }

  beforeEach(() => {
    findInquiryByIdForUser.mockResolvedValue({ id: 'inq-1', userId: 'user-1', learningSourceId: SOURCE.id, title: 'Allocators', createdAt: 'now', updatedAt: 'now' });
    findLearningSourceById.mockResolvedValue({ ...SOURCE, description: 'desc', content: 'content' });
    generateQuestionNode.mockResolvedValue({ explanation: 'e', followUps: ['a', 'b', 'c'], isTrap: false, trapMetadata: null, conceptExtraction: NO_CONCEPTS });
    createNodeAtomically.mockResolvedValue(NEW_ID);
  });

  it('sends no learning path for a root question', async () => {
    listNodesForInquiry.mockResolvedValueOnce([]).mockResolvedValueOnce([storedNode(NEW_ID, null)]);

    await createQuestionNodeForUser('token', 'user-1', 'inq-1', { question: 'What is an arena?', researchMode: false });

    expect(generateQuestionNode).toHaveBeenCalledWith(expect.objectContaining({ learningPath: '' }));
  });

  it('sends the parent and grandparent when branching from a selected follow-up', async () => {
    const followUp = { id: FOLLOW_UP_ID, position: 1, questionText: 'Why does it fragment?', isSelected: false, childNodeId: null };
    const nodes = [storedNode(ROOT_ID, null), storedNode(CHILD_ID, ROOT_ID, [followUp])];
    listNodesForInquiry.mockResolvedValueOnce(nodes).mockResolvedValueOnce([...nodes, storedNode(NEW_ID, CHILD_ID)]);

    await createQuestionNodeForUser('token', 'user-1', 'inq-1', {
      question: 'Why does it fragment?', parentNodeId: CHILD_ID, selectedFollowUpId: FOLLOW_UP_ID, researchMode: false,
    });

    const { learningPath } = generateQuestionNode.mock.calls[0][0] as { learningPath: string };
    expect(learningPath).toContain('GRANDPARENT QUESTION: question 1');
    expect(learningPath).toContain('PARENT QUESTION: question 2\nPARENT EXPLANATION: explanation 2');
    expect(learningPath).toContain('SELECTED THIS FOLLOW-UP: Why does it fragment?');
  });

  it('sends other branches and known concepts, then attaches resolved concepts to the new node', async () => {
    const C1 = '00000000-0000-4000-8000-0000000000c1';
    const nodes = [storedNode(ROOT_ID, null), storedNode(CHILD_ID, ROOT_ID)];
    listNodesForInquiry.mockResolvedValueOnce(nodes).mockResolvedValueOnce([...nodes, storedNode(NEW_ID, ROOT_ID)]);
    listConceptGraphForInquiry.mockResolvedValue({
      concepts: [{ id: C1, name: 'Bump Pointer', slug: 'bump-pointer', aliases: ['Bump Allocation'], createdAt: 'now' }],
      nodeConcepts: [{ questionNodeId: CHILD_ID, conceptId: C1, role: 'defines', weight: 0.9 }],
      conceptEdges: [],
    });
    generateQuestionNode.mockResolvedValue({
      explanation: 'e', followUps: ['a', 'b', 'c'], isTrap: false, trapMetadata: null,
      conceptExtraction: { concepts: [{ name: 'Bump Allocation', slug: 'bump-allocation', role: 'uses', weight: 0.5 }], relations: [] },
    });

    await createQuestionNodeForUser('token', 'user-1', 'inq-1', { question: 'Custom?', parentNodeId: ROOT_ID, researchMode: false });

    const call = generateQuestionNode.mock.calls[0][0] as { otherBranches: string; knownConcepts: string; knownConceptSlugs: string[] };
    expect(call.otherBranches).toBe('- Q: question 2 [concepts: Bump Pointer]');
    expect(call.knownConcepts).toBe('Bump Pointer');
    expect(call.knownConceptSlugs).toContain('bump-allocation');
    expect(attachNodeConcepts).toHaveBeenCalledWith({}, expect.objectContaining({
      userId: 'user-1', nodeId: NEW_ID,
      extraction: { concepts: [expect.objectContaining({ slug: 'bump-pointer' })], relations: [] },
    }));
  });

  it('still returns the node when the concept layer fails to read or write', async () => {
    listNodesForInquiry.mockResolvedValueOnce([]).mockResolvedValueOnce([storedNode(NEW_ID, null)]);
    listConceptGraphForInquiry.mockRejectedValue(new Error('db down'));
    attachNodeConcepts.mockRejectedValue(new Error('db down'));

    const created = await createQuestionNodeForUser('token', 'user-1', 'inq-1', { question: 'Root?', researchMode: false });

    expect(created.id).toBe(NEW_ID);
  });
});
