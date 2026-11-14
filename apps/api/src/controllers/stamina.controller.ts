import type { Request, Response } from 'express';
import type { StaminaResponse } from '@tattva/contracts';
import { ApiError } from '../types/api';
import { createRequestScopedClient } from '../integrations/supabase/client';
import { syncStaminaForUser } from '../services/staminaAwardService';

export async function getMyStamina(req: Request, res: Response<StaminaResponse>): Promise<void> {
  if (!req.auth) throw new ApiError(401, 'missing_token', 'Authentication required');
  const client = createRequestScopedClient(req.auth.accessToken);
  const data = await syncStaminaForUser(client, req.auth.userId);
  res.status(200).json({ data });
}
