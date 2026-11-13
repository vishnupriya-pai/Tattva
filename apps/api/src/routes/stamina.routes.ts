import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getMyStamina } from '../controllers/stamina.controller';

export const staminaRouter = Router();
staminaRouter.get('/me', requireAuth, getMyStamina);
