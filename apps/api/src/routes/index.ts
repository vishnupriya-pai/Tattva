import { Router } from 'express';
import { healthRouter } from './health.routes';
import { meRouter } from './me.routes';
import { inquiriesRouter } from './inquiries.routes';
import { questionNodesRouter } from './question-nodes.routes';
import { staminaRouter } from './stamina.routes';
import { voiceRouter } from './voice.routes';

/**
 * Root router. Product routes mount under /api/v1 (docs/API_CONTRACTS.md);
 * /health stays unversioned.
 */
export const rootRouter = Router();

rootRouter.use('/health', healthRouter);

const v1Router = Router();
v1Router.use('/me', meRouter);
v1Router.use('/inquiries', inquiriesRouter);
v1Router.use('/question-nodes', questionNodesRouter);
v1Router.use('/stamina', staminaRouter);
v1Router.use('/voice', voiceRouter);

rootRouter.use('/api/v1', v1Router);
