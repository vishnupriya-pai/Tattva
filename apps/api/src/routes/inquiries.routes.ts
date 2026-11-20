import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  deleteInquiry,
  getInquiries,
  getInquiry,
  postInquiry,
  postIngestDocument,
  postPrerequisiteProbe,
  postQuestionNode,
} from '../controllers/inquiry.controller';

export const inquiriesRouter = Router();

inquiriesRouter.post('/', requireAuth, postInquiry);
inquiriesRouter.post('/ingest', requireAuth, postIngestDocument);
inquiriesRouter.get('/', requireAuth, getInquiries);
inquiriesRouter.get('/:inquiryId', requireAuth, getInquiry);
inquiriesRouter.delete('/:inquiryId', requireAuth, deleteInquiry);
inquiriesRouter.post('/:inquiryId/nodes', requireAuth, postQuestionNode);
inquiriesRouter.post('/:inquiryId/probe', requireAuth, postPrerequisiteProbe);
