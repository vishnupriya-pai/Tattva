import { Router } from 'express';
import { postTrapAttempt } from '../controllers/inquiry.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAiQuota } from '../middleware/aiQuota';
import { limitAiBurst, limitAiRequestsByIp } from '../middleware/rateLimit';

export const questionNodesRouter = Router();
questionNodesRouter.post(
  '/:nodeId/trap-attempts',
  limitAiRequestsByIp,
  requireAuth,
  limitAiBurst('trap', { anonymous: 8, signedIn: 12 }),
  requireAiQuota('trap'),
  postTrapAttempt,
);
