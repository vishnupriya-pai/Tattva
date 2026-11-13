import { Router } from 'express';
import { postTrapAttempt } from '../controllers/inquiry.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const questionNodesRouter = Router();
questionNodesRouter.post('/:nodeId/trap-attempts', requireAuth, postTrapAttempt);
