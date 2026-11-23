import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  env: { NODE_ENV: 'production', AI_DAILY_GLOBAL_LIMIT: 5000 },
  adminConfigured: vi.fn().mockReturnValue(true),
  consumeAiQuota: vi.fn(),
  refundAiQuota: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../config/env', () => ({ env: mocks.env }));
vi.mock('../integrations/supabase/client', () => ({ isSupabaseAdminConfigured: mocks.adminConfigured }));
vi.mock('../repositories/aiUsageRepository', () => ({
  consumeAiQuota: mocks.consumeAiQuota,
  refundAiQuota: mocks.refundAiQuota,
}));

import { requireAiQuota } from './aiQuota';
import { createWindowLimiter } from './rateLimit';
import { errorHandler } from './errorHandler';

function appWith(isAnonymous: boolean, handlerStatus = 201) {
  const app = express();
  app.use((req, _res, next) => {
    req.auth = { userId: 'u1', isAnonymous, accessToken: 't' };
    next();
  });
  app.post('/q', requireAiQuota('question'), (_req, res) => {
    res.status(handlerStatus).json({ quota: res.locals.aiQuota });
  });
  app.use(errorHandler);
  return app;
}

describe('requireAiQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.NODE_ENV = 'production';
    mocks.adminConfigured.mockReturnValue(true);
  });

  it('uses the anonymous limit and reports what is left', async () => {
    mocks.consumeAiQuota.mockResolvedValue({ allowed: true, reason: null, used: 3, limit: 25 });
    const res = await request(appWith(true)).post('/q');
    expect(res.status).toBe(201);
    expect(res.body.quota).toEqual({ remaining: 22, limit: 25 });
    expect(mocks.consumeAiQuota).toHaveBeenCalledWith('u1', 'question', 25, 5000);
    expect(mocks.refundAiQuota).not.toHaveBeenCalled();
  });

  it('asks anonymous users to sign in when their daily quota is spent', async () => {
    mocks.consumeAiQuota.mockResolvedValue({ allowed: false, reason: 'daily_quota_exceeded', used: 25, limit: 25 });
    const res = await request(appWith(true)).post('/q');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('daily_quota_exceeded');
    expect(res.body.error.message).toContain('Sign in to get 75');
  });

  it('uses the signed-in limit and blocks everyone when the global budget is hit', async () => {
    mocks.consumeAiQuota.mockResolvedValue({ allowed: false, reason: 'service_at_capacity', used: null, limit: 75 });
    const res = await request(appWith(false)).post('/q');
    expect(mocks.consumeAiQuota).toHaveBeenCalledWith('u1', 'question', 75, 5000);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('service_at_capacity');
  });

  it('refunds the unit when the AI call fails', async () => {
    mocks.consumeAiQuota.mockResolvedValue({ allowed: true, reason: null, used: 1, limit: 25 });
    await request(appWith(true, 422)).post('/q');
    await vi.waitFor(() => expect(mocks.refundAiQuota).toHaveBeenCalledWith('u1', 'question'));
  });

  it('fails closed in production and open in development when the check cannot run', async () => {
    mocks.consumeAiQuota.mockRejectedValue(new Error('db down'));
    expect((await request(appWith(true)).post('/q')).status).toBe(503);
    mocks.env.NODE_ENV = 'development';
    expect((await request(appWith(true)).post('/q')).status).toBe(201);
  });
});

describe('createWindowLimiter', () => {
  it('allows up to the limit per window, then reports seconds to wait', () => {
    const limiter = createWindowLimiter(60_000);
    expect(limiter.hit('k', 2, 0)).toBeNull();
    expect(limiter.hit('k', 2, 1000)).toBeNull();
    expect(limiter.hit('k', 2, 2000)).toBe(58);
    expect(limiter.hit('other', 2, 2000)).toBeNull();
    expect(limiter.hit('k', 2, 60_000)).toBeNull();
  });
});
