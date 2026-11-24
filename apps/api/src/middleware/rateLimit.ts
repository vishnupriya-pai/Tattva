import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../types/api';

/**
 * Short-window burst limiting (docs/ARCHITECTURE.md §6.8, layer 1).
 *
 * In-memory fixed windows, so the counts are per API instance and reset on
 * restart. That is fine for burst protection on a single instance; the
 * durable daily limits live in Postgres (see aiQuota.ts).
 */
export interface WindowLimiter {
  /** Returns seconds until the window resets when the key is over its limit, otherwise null. */
  hit(key: string, limit: number, now?: number): number | null;
}

export function createWindowLimiter(windowMs: number): WindowLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = 0;

  return {
    hit(key, limit, now = Date.now()) {
      if (now - lastSweep > windowMs) {
        for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
        lastSweep = now;
      }
      let w = windows.get(key);
      if (!w || w.resetAt <= now) {
        w = { count: 0, resetAt: now + windowMs };
        windows.set(key, w);
      }
      if (w.count >= limit) return Math.max(1, Math.ceil((w.resetAt - now) / 1000));
      w.count += 1;
      return null;
    },
  };
}

const MINUTE = 60_000;
const ipLimiter = createWindowLimiter(MINUTE);
const userLimiter = createWindowLimiter(MINUTE);

export const IP_AI_REQUESTS_PER_MINUTE = 30;

function tooFast(retryAfter: number, res: Response): ApiError {
  res.setHeader('Retry-After', String(retryAfter));
  return new ApiError(429, 'rate_limited', `You're going a bit fast. Try again in ${retryAfter} seconds.`, { retryAfter });
}

/** Caps AI-calling requests per client IP. Runs before auth so floods never reach Supabase. */
export function limitAiRequestsByIp(req: Request, res: Response, next: NextFunction): void {
  const retryAfter = ipLimiter.hit(`ip:${req.ip ?? 'unknown'}`, IP_AI_REQUESTS_PER_MINUTE);
  next(retryAfter === null ? undefined : tooFast(retryAfter, res));
}

/** Per-user burst cap for one kind of AI request. Must run after requireAuth. */
export function limitAiBurst(kind: string, perMinute: { anonymous: number; signedIn: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) return next(new ApiError(401, 'missing_token', 'Authentication required'));
    const limit = req.auth.isAnonymous ? perMinute.anonymous : perMinute.signedIn;
    const retryAfter = userLimiter.hit(`${kind}:${req.auth.userId}`, limit);
    next(retryAfter === null ? undefined : tooFast(retryAfter, res));
  };
}
