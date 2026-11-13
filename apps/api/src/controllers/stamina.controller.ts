import type { Request, Response } from 'express';
import type { StaminaResponse } from '@tattva/contracts';
import { ApiError } from '../types/api';
import { getStaminaForUser } from '../services/inquiryService';

export async function getMyStamina(req: Request, res: Response<StaminaResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');
  const data = await getStaminaForUser(req.auth.accessToken, req.auth.userId);
  res.status(200).json({ data });
}
