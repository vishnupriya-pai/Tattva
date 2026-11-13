import type { SupabaseClient } from '@supabase/supabase-js';
import type { FollowUpQuestion, QuestionNode, TrapMetadata } from '@tattva/contracts';
import { ApiError } from '../types/api';

interface FollowUpRow {
  id: string;
  position: 1 | 2 | 3;
  question_text: string;
  is_selected: boolean;
  child_node_id: string | null;
}

interface QuestionNodeRow {
  id: string;
  parent_node_id: string | null;
  user_question: string;
  ai_explanation: string;
  research_mode: boolean;
  is_trap: boolean;
  trap_metadata: TrapMetadata | null;
  trap_resolved_at: string | null;
  created_at: string;
  follow_up_questions: FollowUpRow[];
}

function mapFollowUp(row: FollowUpRow): FollowUpQuestion {
  return {
    id: row.id,
    position: row.position,
    questionText: row.question_text,
    isSelected: row.is_selected,
    childNodeId: row.child_node_id,
  };
}

function mapNode(row: QuestionNodeRow): QuestionNode {
  return {
    id: row.id,
    parentNodeId: row.parent_node_id,
    userQuestion: row.user_question,
    aiExplanation: row.ai_explanation,
    researchMode: row.research_mode,
    isTrap: row.is_trap,
    trapMetadata: row.trap_metadata,
    trapResolvedAt: row.trap_resolved_at,
    followUps: (row.follow_up_questions ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(mapFollowUp),
    createdAt: row.created_at,
  };
}

/**
 * Read-only access to `question_nodes` + `follow_up_questions` for the
 * inquiry detail endpoint (docs/API_CONTRACTS.md §3, docs/DATABASE.md §3.3/
 * §3.4). No node-creation path exists yet in Stage 5 — this repository is
 * read-only until the Sarvam-integration milestone adds writes.
 */
export async function listNodesForInquiry(client: SupabaseClient, inquiryId: string): Promise<QuestionNode[]> {
  const { data, error } = await client
    .from('question_nodes')
    .select(
      // follow_up_questions has two FKs into question_nodes (question_node_id
      // and child_node_id); the !question_node_id hint tells PostgREST which
      // one to embed here — without it, the query 500s with "more than one
      // relationship was found" (caught live against the real database).
      'id, parent_node_id, user_question, ai_explanation, research_mode, is_trap, trap_metadata, trap_resolved_at, created_at, follow_up_questions!question_node_id(id, position, question_text, is_selected, child_node_id)',
    )
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load nodes for inquiry ${inquiryId}: ${error.message}`);
  }

  return (data ?? []).map((row) => mapNode(row as unknown as QuestionNodeRow));
}

export async function createNodeAtomically(client: SupabaseClient, input: {
  userId: string; inquiryId: string; parentNodeId: string | null; selectedFollowUpId: string | null;
  question: string; explanation: string; researchMode: boolean; isTrap: boolean;
  trapMetadata: TrapMetadata | null; followUps: string[];
}): Promise<string> {
  const { data, error } = await client.rpc('create_question_node', {
    p_user_id: input.userId, p_inquiry_id: input.inquiryId, p_parent_node_id: input.parentNodeId,
    p_selected_follow_up_id: input.selectedFollowUpId, p_user_question: input.question,
    p_ai_explanation: input.explanation, p_research_mode: input.researchMode,
    p_is_trap: input.isTrap, p_trap_metadata: input.trapMetadata,
    p_follow_ups: input.followUps,
  });
  if (error?.code === '23505') throw new ApiError(409, 'graph_conflict', 'That root question or follow-up was already submitted. Refresh and try again.');
  if (error?.code === '23514') throw new ApiError(409, 'graph_progress_blocked', 'Resolve the parent trap before continuing.');
  if (error || typeof data !== 'string') throw new Error(`Failed to persist generated node: ${error?.message ?? 'missing node id'}`);
  return data;
}

export async function resolveTrapForUser(client: SupabaseClient, userId: string, nodeId: string): Promise<string> {
  const { data, error } = await client.rpc('resolve_trap', { p_user_id: userId, p_node_id: nodeId });
  if (error?.code === 'P0002') throw new ApiError(409, 'trap_unavailable', 'This trap is no longer available to resolve. Refresh the workspace.');
  if (error || typeof data !== 'string') throw new Error(`Failed to resolve trap: ${error?.message ?? 'missing timestamp'}`);
  return data;
}

export async function readStamina(client: SupabaseClient): Promise<{
  balance: number;
  recentTransactions: Array<{ id: string; eventType: string; basePoints: number; multiplier: number; finalPoints: number; createdAt: string }>;
}> {
  const { data, error } = await client.from('wallet_transactions')
    .select('id, event_type, base_points, multiplier, final_points, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load Stamina ledger: ${error.message}`);
  const rows = data ?? [];
  return {
    balance: rows.reduce((total, row) => total + Number(row.final_points), 0),
    recentTransactions: rows.slice(0, 20).map((row) => ({
      id: row.id, eventType: row.event_type, basePoints: Number(row.base_points),
      multiplier: Number(row.multiplier), finalPoints: Number(row.final_points), createdAt: row.created_at,
    })),
  };
}
