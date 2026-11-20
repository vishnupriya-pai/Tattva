import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { ApiError } from '../types/api';

const { isSupabaseConfigured, createAnonVerificationClient } = vi.hoisted(() => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
  createAnonVerificationClient: vi.fn(),
}));
const {
  createInquiryForUser,
  listInquiries,
  getInquiryDetail,
  deleteInquiryForUser,
  getPrerequisiteProbeForInquiry,
  createQuestionNodeForUser,
  submitTrapAttempt,
} = vi.hoisted(() => ({
  createInquiryForUser: vi.fn(),
  listInquiries: vi.fn(),
  getInquiryDetail: vi.fn(),
  deleteInquiryForUser: vi.fn(),
  getPrerequisiteProbeForInquiry: vi.fn(),
  createQuestionNodeForUser: vi.fn(),
  submitTrapAttempt: vi.fn(),
}));

const { processVoiceQueryForUser } = vi.hoisted(() => ({
  processVoiceQueryForUser: vi.fn(),
}));

vi.mock('../integrations/supabase/client', () => ({
  isSupabaseConfigured,
  createAnonVerificationClient,
  createRequestScopedClient: vi.fn(),
}));
vi.mock('../services/inquiryService', () => ({
  createInquiryForUser,
  listInquiries,
  getInquiryDetail,
  deleteInquiryForUser,
  getPrerequisiteProbeForInquiry,
  createQuestionNodeForUser,
  submitTrapAttempt,
}));
vi.mock('../services/voiceService', () => ({ processVoiceQueryForUser }));

import { createApp } from '../app';

const VERIFIED_USER = { id: 'a0a0a0a0-0000-4000-8000-000000000001', is_anonymous: true };

function authorizedGetUser() {
  createAnonVerificationClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: VERIFIED_USER }, error: null }) },
  });
}

describe('API authentication (docs/API_CONTRACTS.md §0)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  it('GET /api/v1/me rejects a missing token with 401', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('missing_token');
  });

  it('GET /api/v1/me returns the verified identity for a valid token', async () => {
    authorizedGetUser();

    const res = await request(app).get('/api/v1/me').set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { user: { id: VERIFIED_USER.id, isAnonymous: true } } });
  });
});

describe('POST /api/v1/inquiries', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    authorizedGetUser();
  });

  it('rejects a malformed body with 400', async () => {
    const res = await request(app)
      .post('/api/v1/inquiries')
      .set('Authorization', 'Bearer good-token')
      .send({ learningSourceId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(createInquiryForUser).not.toHaveBeenCalled();
  });

  it('creates the inquiry for a valid request', async () => {
    const sourceId = 'b0b0b0b0-0000-4000-8000-000000000002';
    createInquiryForUser.mockResolvedValue({
      id: 'inq-1',
      userId: VERIFIED_USER.id,
      learningSourceId: sourceId,
      title: null,
      createdAt: 'now',
      updatedAt: 'now',
    });

    const res = await request(app)
      .post('/api/v1/inquiries')
      .set('Authorization', 'Bearer good-token')
      .send({ learningSourceId: sourceId });

    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe(VERIFIED_USER.id);
    expect(createInquiryForUser).toHaveBeenCalledWith('good-token', VERIFIED_USER.id, sourceId);
  });
});

describe('GET /api/v1/inquiries/:inquiryId', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    authorizedGetUser();
  });

  it('returns 404 when the service reports the inquiry is not found/not owned', async () => {
    getInquiryDetail.mockRejectedValue(new ApiError(404, 'inquiry_not_found', 'Inquiry not found'));

    const res = await request(app)
      .get('/api/v1/inquiries/c0c0c0c0-0000-4000-8000-000000000003')
      .set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('inquiry_not_found');
  });

  it('rejects a malformed inquiry id with 400', async () => {
    const res = await request(app)
      .get('/api/v1/inquiries/not-a-uuid')
      .set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(400);
    expect(getInquiryDetail).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/inquiries/:inquiryId', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    authorizedGetUser();
  });

  it('deletes the inquiry and returns success', async () => {
    deleteInquiryForUser.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/v1/inquiries/c0c0c0c0-0000-4000-8000-000000000003')
      .set('Authorization', 'Bearer good-token');

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.deletedId).toBe('c0c0c0c0-0000-4000-8000-000000000003');
    expect(deleteInquiryForUser).toHaveBeenCalledWith('good-token', VERIFIED_USER.id, 'c0c0c0c0-0000-4000-8000-000000000003');
  });

  it('rejects a missing token with 401', async () => {
    const res = await request(app).delete('/api/v1/inquiries/c0c0c0c0-0000-4000-8000-000000000003');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/voice/ask', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    authorizedGetUser();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/voice/ask')
      .send({ audioBase64: 'fake-audio' });
    expect(res.status).toBe(401);
  });

  it('processes voice query and returns transcript, answer, and synthesized audio', async () => {
    processVoiceQueryForUser.mockResolvedValue({
      transcript: 'What is attention mechanism?',
      responseText: 'Attention allows neural models to focus on relevant tokens.',
      audioBase64: 'audio-bytes-base64',
      languageCode: 'en-IN',
    });

    const res = await request(app)
      .post('/api/v1/voice/ask')
      .set('Authorization', 'Bearer good-token')
      .send({
        audioBase64: 'fake-base64-audio',
        mimeType: 'audio/webm',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.transcript).toBe('What is attention mechanism?');
    expect(res.body.data.audioBase64).toBe('audio-bytes-base64');
    expect(res.body.data.languageCode).toBe('en-IN');
    expect(processVoiceQueryForUser).toHaveBeenCalledWith(
      'good-token',
      VERIFIED_USER.id,
      'fake-base64-audio',
      'audio/webm',
      undefined,
      undefined,
    );
  });
});

describe('POST /api/v1/inquiries/:inquiryId/probe (Socratic Inversion)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    authorizedGetUser();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/v1/inquiries/c0c0c0c0-0000-4000-8000-000000000003/probe')
      .send({ conceptTopic: 'Multi-Head Attention' });
    expect(res.status).toBe(401);
  });

  it('returns a prerequisite probe for a valid concept topic', async () => {
    getPrerequisiteProbeForInquiry.mockResolvedValue({
      probePrompt: 'Why does inner product affinity grow large as dimensionality increases?',
      targetConcept: 'Multi-Head Attention',
      prerequisiteContext: 'Consider dot product variance scaling.',
    });

    const res = await request(app)
      .post('/api/v1/inquiries/c0c0c0c0-0000-4000-8000-000000000003/probe')
      .set('Authorization', 'Bearer good-token')
      .send({
        conceptTopic: 'Multi-Head Attention',
        researchMode: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.probePrompt).toBe('Why does inner product affinity grow large as dimensionality increases?');
    expect(res.body.data.targetConcept).toBe('Multi-Head Attention');
    expect(getPrerequisiteProbeForInquiry).toHaveBeenCalledWith(
      'good-token',
      VERIFIED_USER.id,
      'c0c0c0c0-0000-4000-8000-000000000003',
      'Multi-Head Attention',
      false,
    );
  });
});

describe('POST /api/v1/question-nodes/:nodeId/trap-attempts (Contrastive Falsification)', () => {
  const app = createApp();
  const testNodeId = 'd0d0d0d0-0000-4000-8000-000000000004';

  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    authorizedGetUser();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post(`/api/v1/question-nodes/${testNodeId}/trap-attempts`)
      .send({ response: 'Valid explanation' });
    expect(res.status).toBe(401);
  });

  it('accepts legacy open-ended response submissions', async () => {
    submitTrapAttempt.mockResolvedValue({
      result: 'survived',
      trapResolvedAt: '2026-11-17T12:00:00.000Z',
      staminaAwarded: null,
    });

    const res = await request(app)
      .post(`/api/v1/question-nodes/${testNodeId}/trap-attempts`)
      .set('Authorization', 'Bearer good-token')
      .send({ response: 'Explaining why gradient saturation happens' });

    expect(res.status).toBe(200);
    expect(res.body.data.result).toBe('survived');
    expect(submitTrapAttempt).toHaveBeenCalledWith(
      'good-token',
      VERIFIED_USER.id,
      testNodeId,
      'Explaining why gradient saturation happens',
    );
  });

  it('accepts contrastive falsification submissions with option, citation, and justification', async () => {
    submitTrapAttempt.mockResolvedValue({
      result: 'survived',
      trapResolvedAt: '2026-11-17T12:00:00.000Z',
      staminaAwarded: null,
    });

    const submission = {
      selectedOptionId: 'claim-a',
      citationSpan: 'Vaswani et al. Section 3.2.1',
      justification: 'The claim ignores the scaling factor of 1/sqrt(d_k).',
    };

    const res = await request(app)
      .post(`/api/v1/question-nodes/${testNodeId}/trap-attempts`)
      .set('Authorization', 'Bearer good-token')
      .send(submission);

    expect(res.status).toBe(200);
    expect(res.body.data.result).toBe('survived');
    expect(submitTrapAttempt).toHaveBeenCalledWith(
      'good-token',
      VERIFIED_USER.id,
      testNodeId,
      submission,
    );
  });
});
