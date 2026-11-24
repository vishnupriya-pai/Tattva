import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { isSupabaseAdminConfigured } from '../integrations/supabase/client';
import { consumeAiQuota, refundAiQuota, type AiUsageKind } from '../repositories/aiUsageRepository';
import { ApiError } from '../types/api';
import { logger } from '../utils/logger';

/**
 * Daily AI quotas (docs/ARCHITECTURE.md §6.8, layers 2 and 3).
 *
 * Consumes one unit before the route calls Sarvam and refunds it if the
 * request ends in an error, so failed answers don't count. Days reset at
 * midnight India time. In production a quota check that can't run blocks
 * the request (fail closed); in development it is skipped with a warning.
 */
export const DAILY_AI_LIMITS: Record<AiUsageKind, { anonymous: number; signedIn: number }> = {
  question: { anonymous: 25, signedIn: 75 },
  trap: { anonymous: 50, signedIn: 100 },
  voice: { anonymous: 10, signedIn: 40 },
};

const NOUN: Record<AiUsageKind, string> = { question: 'questions', trap: 'trap answers', voice: 'voice questions' };

export interface AiQuotaState {
  remaining: number;
  limit: number;
}

function quotaUnavailable(next: NextFunction, cause: unknown): void {
  if (env.NODE_ENV === 'production') {
    logger.error({ err: cause }, 'AI quota check failed');
    next(new ApiError(503, 'quota_unavailable', 'Tattva could not check your usage right now. Please try again in a minute.'));
    return;
  }
  logger.warn({ err: cause }, 'AI quota check skipped (development)');
  next();
}

export function requireAiQuota(kind: AiUsageKind) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) return next(new ApiError(401, 'missing_token', 'Authentication required'));
    if (!isSupabaseAdminConfigured()) return quotaUnavailable(next, 'SUPABASE_SERVICE_ROLE_KEY not set');

    const { userId, isAnonymous } = req.auth;
    const limits = DAILY_AI_LIMITS[kind];
    const userLimit = isAnonymous ? limits.anonymous : limits.signedIn;

    let decision;
    try {
      decision = await consumeAiQuota(userId, kind, userLimit, env.AI_DAILY_GLOBAL_LIMIT);
    } catch (cause) {
      return quotaUnavailable(next, cause);
    }

    if (decision.reason === 'service_at_capacity') {
      logger.warn({ kind }, 'Global daily AI budget reached');
      return next(new ApiError(429, 'service_at_capacity', 'Tattva has reached its usage limit for today. Please come back tomorrow.'));
    }
    if (!decision.allowed) {
      const message = isAnonymous
        ? `You've used today's ${userLimit} free ${NOUN[kind]}. Sign in to get ${limits.signedIn} a day, or come back tomorrow.`
        : `You've used today's ${userLimit} ${NOUN[kind]}. Your limit resets at midnight (India time).`;
      return next(new ApiError(429, 'daily_quota_exceeded', message, { limit: userLimit }));
    }

    const quota: AiQuotaState = { remaining: Math.max(0, userLimit - (decision.used ?? 0)), limit: userLimit };
    res.locals.aiQuota = quota;
    res.on('finish', () => {
      if (res.statusCode < 400) return;
      refundAiQuota(userId, kind).catch((err: unknown) => logger.error({ err }, 'AI quota refund failed'));
    });
    next();
  };
}
