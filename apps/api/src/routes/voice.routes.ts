import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAiQuota } from '../middleware/aiQuota';
import { limitAiBurst, limitAiRequestsByIp } from '../middleware/rateLimit';
import { postVoiceQuery } from '../controllers/voice.controller';

export const voiceRouter = Router();

voiceRouter.post(
  '/ask',
  limitAiRequestsByIp,
  requireAuth,
  limitAiBurst('voice', { anonymous: 3, signedIn: 5 }),
  requireAiQuota('voice'),
  postVoiceQuery,
);
