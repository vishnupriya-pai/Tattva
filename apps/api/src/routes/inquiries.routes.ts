import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getInquiries, getInquiry, postInquiry, postQuestionNode } from '../controllers/inquiry.controller';

export const inquiriesRouter = Router();

inquiriesRouter.post('/', requireAuth, postInquiry);
inquiriesRouter.get('/', requireAuth, getInquiries);
inquiriesRouter.get('/:inquiryId', requireAuth, getInquiry);
inquiriesRouter.post('/:inquiryId/nodes', requireAuth, postQuestionNode);
