import { getAdminClient } from '../integrations/supabase/client';

export type AiUsageKind = 'question' | 'trap' | 'voice';

export interface QuotaDecision {
  allowed: boolean;
  reason: 'service_at_capacity' | 'daily_quota_exceeded' | null;
  used: number | null;
  limit: number;
}

/** Atomically consumes one unit of today's per-user and global AI quota (consume_ai_quota). */
export async function consumeAiQuota(
  userId: string,
  kind: AiUsageKind,
  userLimit: number,
  globalLimit: number,
): Promise<QuotaDecision> {
  const { data, error } = await getAdminClient().rpc('consume_ai_quota', {
    p_user_id: userId,
    p_kind: kind,
    p_user_limit: userLimit,
    p_global_limit: globalLimit,
  });
  if (error) throw new Error(`consume_ai_quota failed: ${error.message}`);
  return data as QuotaDecision;
}

/** Returns one unit after a failed AI call (refund_ai_quota). */
export async function refundAiQuota(userId: string, kind: AiUsageKind): Promise<void> {
  const { error } = await getAdminClient().rpc('refund_ai_quota', { p_user_id: userId, p_kind: kind });
  if (error) throw new Error(`refund_ai_quota failed: ${error.message}`);
}
