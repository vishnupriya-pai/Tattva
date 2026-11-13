import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createInquiryRequestSchema,
  inquiryIdParamsSchema,
  type CreateInquiryResponse,
  type GetInquiryResponse,
  type ListInquiriesResponse,
  type DeleteInquiryResponse,
  createQuestionNodeRequestSchema,
  type CreateQuestionNodeResponse,
  trapAttemptRequestSchema,
  type TrapAttemptResponse,
} from '@tattva/contracts';
import { ApiError } from '../types/api';
import {
  createInquiryForUser,
  createQuestionNodeForUser,
  deleteInquiryForUser,
  getInquiryDetail,
  listInquiries,
  submitTrapAttempt,
} from '../services/inquiryService';

/**
 * Controllers for the inquiry endpoints (docs/API_CONTRACTS.md §2, §3, and
 * the list endpoint documented as an addition in Stage 5 — see that doc's
 * note). Thin: validate, call the service, shape the response.
 */
export async function postInquiry(req: Request, res: Response<CreateInquiryResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');

  const body = createInquiryRequestSchema.parse(req.body);
  const inquiry = body.title !== undefined
    ? await createInquiryForUser(req.auth.accessToken, req.auth.userId, body.learningSourceId, body.title)
    : await createInquiryForUser(req.auth.accessToken, req.auth.userId, body.learningSourceId);

  res.status(201).json({ data: inquiry });
}

export async function getInquiries(req: Request, res: Response<ListInquiriesResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');

  const inquiries = await listInquiries(req.auth.accessToken, req.auth.userId);
  res.status(200).json({ data: inquiries });
}

export async function getInquiry(req: Request, res: Response<GetInquiryResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');

  const { inquiryId } = inquiryIdParamsSchema.parse(req.params);

  const detail = await getInquiryDetail(req.auth.accessToken, req.auth.userId, inquiryId);
  res.status(200).json({ data: detail });
}

export async function deleteInquiry(req: Request, res: Response<DeleteInquiryResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');

  const { inquiryId } = inquiryIdParamsSchema.parse(req.params);
  await deleteInquiryForUser(req.auth.accessToken, req.auth.userId, inquiryId);

  res.status(200).json({ data: { success: true, deletedId: inquiryId } });
}

export async function postQuestionNode(req: Request, res: Response<CreateQuestionNodeResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');
  const { inquiryId } = inquiryIdParamsSchema.parse(req.params);
  const body = createQuestionNodeRequestSchema.parse(req.body);
  const node = await createQuestionNodeForUser(req.auth.accessToken, req.auth.userId, inquiryId, body);
  res.status(201).json({ data: { node, staminaAwarded: null } });
}

export async function postTrapAttempt(req: Request, res: Response<TrapAttemptResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');
  const { nodeId } = z.object({ nodeId: z.string().uuid() }).parse(req.params);
  const body = trapAttemptRequestSchema.parse(req.body);
  const result = await submitTrapAttempt(req.auth.accessToken, req.auth.userId, nodeId, body.response);
  res.status(200).json({ data: result });
}
