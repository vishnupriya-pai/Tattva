import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireAiQuota } from '../middleware/aiQuota';
import { limitAiBurst, limitAiRequestsByIp } from '../middleware/rateLimit';
import {
  deleteInquiry,
  getInquiries,
  getInquiry,
  postInquiry,
  postQuestionNode,
} from '../controllers/inquiry.controller';

export const inquiriesRouter = Router();

inquiriesRouter.post('/', requireAuth, postInquiry);
inquiriesRouter.get('/', requireAuth, getInquiries);
inquiriesRouter.get('/:inquiryId', requireAuth, getInquiry);
inquiriesRouter.delete('/:inquiryId', requireAuth, deleteInquiry);
inquiriesRouter.post(
  '/:inquiryId/nodes',
  limitAiRequestsByIp,
  requireAuth,
  limitAiBurst('question', { anonymous: 5, signedIn: 8 }),
  requireAiQuota('question'),
  postQuestionNode,
);
