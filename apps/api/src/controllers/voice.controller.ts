import type { Request, Response } from 'express';
import { voiceQueryRequestSchema, type VoiceQueryResponse } from '@tattva/contracts';
import { ApiError } from '../types/api';
import { processVoiceQueryForUser } from '../services/voiceService';

export async function postVoiceQuery(req: Request, res: Response<VoiceQueryResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');

  const body = voiceQueryRequestSchema.parse(req.body);
  const result = await processVoiceQueryForUser(
    req.auth.accessToken,
    req.auth.userId,
    body.audioBase64,
    body.mimeType,
    body.inquiryId,
    body.history,
  );

  res.status(200).json({ data: result });
}
