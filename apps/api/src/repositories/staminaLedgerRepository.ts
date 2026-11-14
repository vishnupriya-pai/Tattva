import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimal per-node shape needed to (a) decide what ledger entries are still
 * missing and (b) derive the streak/conquered signals, without duplicating
 * the full `questionNodeRepository.mapNode` assembly (follow-ups aren't
 * needed here).
 */
export interface NodeForStamina {
  id: string;
  inquiryId: string;
  parentNodeId: string | null;
  researchMode: boolean;
  isTrap: boolean;
  trapResolvedAt: string | null;
  createdAt: string;
}

interface NodeForStaminaRow {
  id: string;
  inquiry_id: string;
  parent_node_id: string | null;
  research_mode: boolean;
  is_trap: boolean;
  trap_resolved_at: string | null;
  created_at: string;
}

/**
 * All of the caller's own question_nodes across every inquiry (RLS: a node
 * is visible only via its owning inquiry's user_id — docs/DATABASE.md §10,
 * mirrored by the `inquiries.user_id` filter below as the documented second
 * authorization layer, same pattern as `submitTrapAttempt` in
 * inquiryService.ts).
 */
export async function listAllNodesForUser(client: SupabaseClient, userId: string): Promise<NodeForStamina[]> {
  const { data, error } = await client
    .from('question_nodes')
    .select('id, inquiry_id, parent_node_id, research_mode, is_trap, trap_resolved_at, created_at, inquiries!inner(user_id)')
    .eq('inquiries.user_id', userId);

  if (error) {
    throw new Error(`Failed to load nodes for Stamina sync: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const r = row as unknown as NodeForStaminaRow;
    return {
      id: r.id,
      inquiryId: r.inquiry_id,
      parentNodeId: r.parent_node_id,
      researchMode: r.research_mode,
      isTrap: r.is_trap,
      trapResolvedAt: r.trap_resolved_at,
      createdAt: r.created_at,
    };
  });
}

export interface LedgerEntryInput {
  userId: string;
  inquiryId: string;
  questionNodeId: string;
  eventType: string;
  basePoints: number;
  multiplier: number;
  finalPoints: number;
  idempotencyKey: string;
}

/**
 * Append-only, idempotent ledger writes (docs/DATABASE.md §3.5/§10/§11).
 * `wallet_transactions` has no insert policy for the `authenticated` role —
 * this must be called with the admin (service-role) client, from inside a
 * trusted service method that has already verified ownership of every node
 * being credited (here: `listAllNodesForUser` already scoped the nodes to
 * `userId` via RLS, so there is nothing further to check).
 *
 * Safe to call repeatedly with entries that were already written: the
 * unique `idempotency_key` constraint plus `ignoreDuplicates` makes this a
 * no-op for anything already ledgered, so a user's whole node history can be
 * re-synced on every Stamina read without double-crediting.
 */
export async function upsertLedgerEntriesIfMissing(adminClient: SupabaseClient, entries: LedgerEntryInput[]): Promise<void> {
  if (entries.length === 0) return;

  const rows = entries.map((entry) => ({
    user_id: entry.userId,
    inquiry_id: entry.inquiryId,
    question_node_id: entry.questionNodeId,
    event_type: entry.eventType,
    base_points: entry.basePoints,
    multiplier: entry.multiplier,
    final_points: entry.finalPoints,
    idempotency_key: entry.idempotencyKey,
  }));

  const { error } = await adminClient
    .from('wallet_transactions')
    .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true });

  if (error) {
    throw new Error(`Failed to write Stamina ledger entries: ${error.message}`);
  }
}
