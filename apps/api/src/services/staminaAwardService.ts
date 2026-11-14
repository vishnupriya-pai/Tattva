import type { SupabaseClient } from '@supabase/supabase-js';
import type { StaminaResponse } from '@tattva/contracts';
import { getAdminClient, isSupabaseAdminConfigured } from '../integrations/supabase/client';
import { readStamina } from '../repositories/questionNodeRepository';
import {
  listAllNodesForUser,
  upsertLedgerEntriesIfMissing,
  type LedgerEntryInput,
  type NodeForStamina,
} from '../repositories/staminaLedgerRepository';

/**
 * Cognitive Stamina point values (Tattva PRD §10: session start, selecting a
 * deep-dive meta-question, and surviving a "Be Careful Here!!" trap each
 * award points; Research Mode applies the PRD's 3x multiplier). These are a
 * reasonable, reversible default — not yet a product-reviewed decision — and
 * can be retuned without any schema or ledger-shape change.
 */
const POINTS = {
  sessionStarted: 10,
  followupSelected: 15,
  trapSurvived: 50,
} as const;

function multiplierFor(node: NodeForStamina): number {
  return node.researchMode ? 3 : 1;
}

function buildLedgerEntries(userId: string, nodes: NodeForStamina[]): LedgerEntryInput[] {
  const entries: LedgerEntryInput[] = [];

  for (const node of nodes) {
    const multiplier = multiplierFor(node);
    const isRoot = node.parentNodeId === null;
    const basePoints = isRoot ? POINTS.sessionStarted : POINTS.followupSelected;

    entries.push({
      userId,
      inquiryId: node.inquiryId,
      questionNodeId: node.id,
      eventType: isRoot ? 'session_started' : 'followup_selected',
      basePoints,
      multiplier,
      finalPoints: Math.round(basePoints * multiplier),
      idempotencyKey: `node_created:${node.id}`,
    });

    if (node.isTrap && node.trapResolvedAt) {
      entries.push({
        userId,
        inquiryId: node.inquiryId,
        questionNodeId: node.id,
        eventType: 'trap_survived',
        basePoints: POINTS.trapSurvived,
        multiplier,
        finalPoints: Math.round(POINTS.trapSurvived * multiplier),
        idempotencyKey: `trap_survived:${node.id}`,
      });
    }
  }

  return entries;
}

/**
 * Consecutive-day streak ending at the user's most recent activity date
 * (not necessarily "today" — the number reflects how many days in a row
 * they showed up before/including their last session, which still reads
 * correctly whether they're active right now or not).
 */
function computeStreakDays(createdAtTimestamps: string[]): number {
  if (createdAtTimestamps.length === 0) return 0;

  const days = new Set(createdAtTimestamps.map((ts) => new Date(ts).toISOString().slice(0, 10)));
  const sortedDescending = Array.from(days).sort().reverse();

  let streak = 1;
  const cursor = new Date(`${sortedDescending[0]}T00:00:00.000Z`);

  for (let i = 1; i < sortedDescending.length; i += 1) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const expected = cursor.toISOString().slice(0, 10);
    if (sortedDescending[i] === expected) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * An inquiry counts as "conquered" (Tattva PRD §6, scaled down from the full
 * Boss Fight/badge system) once its root question has been asked and every
 * trap raised along the way has been resolved — i.e. nothing is currently
 * blocking further progress on it.
 */
function computeConqueredInquiryIds(nodes: NodeForStamina[]): string[] {
  const byInquiry = new Map<string, NodeForStamina[]>();
  for (const node of nodes) {
    const bucket = byInquiry.get(node.inquiryId) ?? [];
    bucket.push(node);
    byInquiry.set(node.inquiryId, bucket);
  }

  const conquered: string[] = [];
  for (const [inquiryId, inquiryNodes] of byInquiry) {
    const hasRoot = inquiryNodes.some((node) => node.parentNodeId === null);
    const hasUnresolvedTrap = inquiryNodes.some((node) => node.isTrap && !node.trapResolvedAt);
    if (hasRoot && !hasUnresolvedTrap) conquered.push(inquiryId);
  }

  return conquered;
}

/**
 * Stamina sync-then-read (docs/ARCHITECTURE.md §6.3, Tattva PRD §10). Scans
 * the caller's own node history for events not yet in the append-only
 * ledger and writes them (admin client, only after RLS has already scoped
 * every node to this user), then returns balance/history plus the derived
 * streak and per-inquiry "conquered" signals in one response.
 *
 * If the admin client isn't configured, awarding is skipped (no new ledger
 * entries can be written) but the read side and the derived signals still
 * work off whatever already exists — consistent with CLAUDE.md §5/§6:
 * optional integration credentials must not block ordinary reads.
 */
export async function syncStaminaForUser(
  client: SupabaseClient,
  userId: string,
): Promise<StaminaResponse['data']> {
  const nodes = await listAllNodesForUser(client, userId);

  if (isSupabaseAdminConfigured()) {
    const entries = buildLedgerEntries(userId, nodes);
    await upsertLedgerEntriesIfMissing(getAdminClient(), entries);
  }

  const stamina = await readStamina(client);

  return {
    ...stamina,
    streakDays: computeStreakDays(nodes.map((node) => node.createdAt)),
    conqueredInquiryIds: computeConqueredInquiryIds(nodes),
  };
}
