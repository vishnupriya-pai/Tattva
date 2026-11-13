import type { CreateQuestionNodeRequest, Inquiry, InquiryDetail, QuestionNode } from '@tattva/contracts';
import { createRequestScopedClient, getAdminClient, isSupabaseAdminConfigured } from '../integrations/supabase/client';
import { ApiError } from '../types/api';
import { findLearningSourceById } from '../repositories/learningSourceRepository';
import {
  createInquiry as createInquiryRow,
  deleteInquiryById,
  findInquiryByIdForUser,
  listInquiriesForUser,
} from '../repositories/inquiryRepository';
import { createNodeAtomically, listNodesForInquiry, readStamina, resolveTrapForUser } from '../repositories/questionNodeRepository';
import { generateQuestionNode, evaluateTrap } from '../integrations/sarvam/client';

/**
 * Inquiry service (docs/ARCHITECTURE.md §3). Owns ownership checks and
 * cross-entity assembly; controllers never touch repositories directly.
 */
export async function createInquiryForUser(
  accessToken: string,
  userId: string,
  learningSourceId: string,
  title?: string,
): Promise<Inquiry> {
  const client = createRequestScopedClient(accessToken);

  const source = await findLearningSourceById(client, learningSourceId);
  if (!source) {
    throw new ApiError(404, 'learning_source_not_found', 'The referenced learning source does not exist');
  }

  return title !== undefined
    ? createInquiryRow(client, userId, learningSourceId, title)
    : createInquiryRow(client, userId, learningSourceId);
}

export async function createQuestionNodeForUser(
  accessToken: string, userId: string, inquiryId: string, input: CreateQuestionNodeRequest,
): Promise<QuestionNode> {
  const client = createRequestScopedClient(accessToken);
  const inquiry = await findInquiryByIdForUser(client, inquiryId, userId);
  if (!inquiry) throw new ApiError(404, 'inquiry_not_found', 'Inquiry not found');
  const source = await findLearningSourceById(client, inquiry.learningSourceId);
  if (!source) throw new ApiError(404, 'learning_source_not_found', 'The inquiry references a missing learning source');
  const existingNodes = await listNodesForInquiry(client, inquiryId);

  if (input.selectedFollowUpId) {
    const parent = existingNodes.find((node) => node.id === input.parentNodeId);
    if (!parent) throw new ApiError(404, 'parent_node_not_found', 'Parent node not found');
    if (parent.isTrap && !parent.trapResolvedAt) throw new ApiError(409, 'trap_unresolved', 'Resolve the trap before continuing.');
    const followUp = parent.followUps.find((item) => item.id === input.selectedFollowUpId);
    if (!followUp || followUp.isSelected || followUp.childNodeId) throw new ApiError(409, 'followup_unavailable', 'That follow-up has already been used or is unavailable.');
    if (followUp.questionText !== input.question) throw new ApiError(400, 'followup_question_mismatch', 'Use the selected follow-up question as written.');
  } else if (input.parentNodeId) {
    const parent = existingNodes.find((node) => node.id === input.parentNodeId);
    if (!parent) throw new ApiError(404, 'parent_node_not_found', 'Parent node not found');
    if (parent.isTrap && !parent.trapResolvedAt) throw new ApiError(409, 'trap_unresolved', 'Resolve the trap before continuing.');
  } else if (existingNodes.length > 0) {
    throw new ApiError(409, 'root_already_exists', 'This inquiry already has a root question. Select a follow-up or specify a parent node to branch from.');
  }

  if (!isSupabaseAdminConfigured()) throw new ApiError(503, 'admin_database_not_configured', 'Set SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.local to enable graph writes.');
  const generated = await generateQuestionNode({
    question: input.question, sourceTitle: source.title, sourceDescription: source.description, sourceContent: source.content,
    researchMode: input.researchMode,
  });
  const id = await createNodeAtomically(getAdminClient(), {
    userId, inquiryId, parentNodeId: input.parentNodeId ?? null,
    selectedFollowUpId: input.selectedFollowUpId ?? null, question: input.question,
    explanation: generated.explanation, researchMode: input.researchMode,
    isTrap: generated.isTrap, trapMetadata: generated.trapMetadata,
    followUps: generated.followUps,
  });
  const created = (await listNodesForInquiry(client, inquiryId)).find((node) => node.id === id);
  if (!created) throw new Error('Created node could not be reloaded');
  return created;
}

export async function submitTrapAttempt(accessToken: string, userId: string, nodeId: string, response: string) {
  const client = createRequestScopedClient(accessToken);
  const { data, error } = await client.from('question_nodes')
    .select('id, inquiry_id, is_trap, trap_metadata, trap_resolved_at, inquiries!inner(user_id)')
    .eq('id', nodeId).eq('inquiries.user_id', userId).maybeSingle();
  if (error) throw new Error(`Failed to load trap: ${error.message}`);
  if (!data || !data.is_trap || !data.trap_metadata) throw new ApiError(404, 'trap_not_found', 'Trap not found');
  if (data.trap_resolved_at) throw new ApiError(409, 'trap_already_resolved', 'This trap has already been resolved.');
  const metadata = data.trap_metadata as { scenario?: unknown };
  if (typeof metadata.scenario !== 'string') throw new ApiError(422, 'invalid_trap_data', 'Trap metadata is incomplete.');
  if (!isSupabaseAdminConfigured()) throw new ApiError(503, 'admin_database_not_configured', 'Set SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.local to resolve traps.');
  const evaluation = await evaluateTrap(response, metadata.scenario);
  if (!evaluation.survived) return { result: 'retry' as const, feedback: evaluation.feedback };
  const trapResolvedAt = await resolveTrapForUser(getAdminClient(), userId, nodeId);
  return { result: 'survived' as const, trapResolvedAt, staminaAwarded: null };
}

export async function getStaminaForUser(accessToken: string, userId: string) {
  const client = createRequestScopedClient(accessToken);
  void userId; // The request token enforces owner-only ledger reads through RLS.
  return readStamina(client);
}

export async function listInquiries(accessToken: string, userId: string): Promise<Inquiry[]> {
  const client = createRequestScopedClient(accessToken);
  return listInquiriesForUser(client, userId);
}

export async function getInquiryDetail(
  accessToken: string,
  userId: string,
  inquiryId: string,
): Promise<InquiryDetail> {
  const client = createRequestScopedClient(accessToken);

  const inquiry = await findInquiryByIdForUser(client, inquiryId, userId);
  if (!inquiry || inquiry.userId !== userId) {
    // 404, not 403: do not leak existence of another user's resource (docs/ARCHITECTURE.md §7.1).
    throw new ApiError(404, 'inquiry_not_found', 'Inquiry not found');
  }

  const source = await findLearningSourceById(client, inquiry.learningSourceId);
  if (!source) {
    throw new ApiError(404, 'learning_source_not_found', 'The inquiry references a missing learning source');
  }

  const nodes = await listNodesForInquiry(client, inquiry.id);

  return { id: inquiry.id, learningSource: source, nodes };
}

export async function deleteInquiryForUser(
  accessToken: string,
  userId: string,
  inquiryId: string,
): Promise<void> {
  const client = createRequestScopedClient(accessToken);
  const inquiry = await findInquiryByIdForUser(client, inquiryId, userId);
  if (!inquiry || inquiry.userId !== userId) {
    throw new ApiError(404, 'inquiry_not_found', 'Inquiry not found');
  }

  const admin = isSupabaseAdminConfigured() ? getAdminClient() : client;
  await deleteInquiryById(admin, inquiryId);
}
