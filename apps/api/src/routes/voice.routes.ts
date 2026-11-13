import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { postVoiceQuery } from '../controllers/voice.controller';

export const voiceRouter = Router();

voiceRouter.post('/ask', requireAuth, postVoiceQuery);
