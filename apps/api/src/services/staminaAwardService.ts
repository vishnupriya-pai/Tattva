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

import { calculateStaminaMinting } from './staminaLedger';

function buildLedgerEntries(userId: string, nodes: NodeForStamina[]): LedgerEntryInput[] {
  const entries: LedgerEntryInput[] = [];

  for (const node of nodes) {
    const isRoot = node.parentNodeId === null;
    const mint = calculateStaminaMinting({
      userId,
      inquiryId: node.inquiryId,
      nodeId: node.id,
      eventType: 'hypothesis_formulated',
      researchMode: node.researchMode,
      learnerHypothesis: node.learnerHypothesis,
      timeToFormulationMs: node.timeToFormulationMs,
      isTrap: node.isTrap,
    });

    const combinedMultiplier = Number(
      (mint.trapMultiplier * mint.revisionMultiplier * mint.telemetryMultiplier).toFixed(2),
    );

    entries.push({
      userId,
      inquiryId: node.inquiryId,
      questionNodeId: node.id,
      eventType: isRoot ? 'session_started' : 'followup_selected',
      basePoints: mint.basePoints,
      multiplier: combinedMultiplier,
      finalPoints: mint.finalPoints,
      idempotencyKey: `node_created:${node.id}`,
      proofOfStruggleMetadata: mint.metadata as unknown as Record<string, unknown>,
      transactionSignature: mint.signature,
    });

    if (node.isTrap && node.trapResolvedAt) {
      const trapMint = calculateStaminaMinting({
        userId,
        inquiryId: node.inquiryId,
        nodeId: node.id,
        eventType: 'trap_survived',
        researchMode: node.researchMode,
        isTrap: true,
        timeToFormulationMs: node.timeToFormulationMs,
      });

      const trapCombinedMultiplier = Number(
        (trapMint.trapMultiplier * trapMint.revisionMultiplier * trapMint.telemetryMultiplier).toFixed(2),
      );

      entries.push({
        userId,
        inquiryId: node.inquiryId,
        questionNodeId: node.id,
        eventType: 'trap_survived',
        basePoints: trapMint.basePoints,
        multiplier: trapCombinedMultiplier,
        finalPoints: trapMint.finalPoints,
        idempotencyKey: `trap_survived:${node.id}`,
        proofOfStruggleMetadata: trapMint.metadata as unknown as Record<string, unknown>,
        transactionSignature: trapMint.signature,
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
