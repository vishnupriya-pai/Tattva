import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  deleteInquiry,
  getInquiries,
  getInquiry,
  postDiscoverConnections,
  postInquiry,
  postQuestionNode,
} from '../controllers/inquiry.controller';

export const inquiriesRouter = Router();

inquiriesRouter.post('/', requireAuth, postInquiry);
inquiriesRouter.get('/', requireAuth, getInquiries);
inquiriesRouter.get('/:inquiryId', requireAuth, getInquiry);
inquiriesRouter.delete('/:inquiryId', requireAuth, deleteInquiry);
inquiriesRouter.post('/:inquiryId/nodes', requireAuth, postQuestionNode);
inquiriesRouter.post('/:inquiryId/connections/discover', requireAuth, postDiscoverConnections);
