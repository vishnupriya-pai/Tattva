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
import { generateQuestionNode, evaluateTrap, generatePrerequisiteProbe, evaluateContrastiveTrap } from '../integrations/sarvam/client';

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
  let source = await findLearningSourceById(client, inquiry.learningSourceId);
  if (!source) throw new ApiError(404, 'learning_source_not_found', 'The inquiry references a missing learning source');

  // Dynamic source resolution: Never force Memory Arena or Transformers as a static fallback for other topics.
  // Resolve appropriate context based on the user's specific inquiry topic and question.
  const qLower = input.question.toLowerCase();
  const inqTitle = inquiry.title || '';
  const inqTitleLower = inqTitle.toLowerCase();

  const isTransformerQuestion =
    (qLower.includes('transformer') || qLower.includes('vaswani') || qLower.includes('multi-head attention') || qLower.includes('self-attention')) ||
    (inqTitleLower.includes('transformer') || inqTitleLower.includes('attention is all you need'));

  const isArenaQuestion =
    (qLower.includes('arena') || qLower.includes('bump pointer') || (qLower.includes('allocator') && qLower.includes('malloc'))) ||
    inqTitleLower.includes('arena');

  let effectiveTitle = inqTitle || source.title;
  let effectiveDescription = source.description;
  let effectiveContent = source.content;

  if (isTransformerQuestion) {
    const attentionSource = await findLearningSourceById(client, '22222222-2222-4222-8222-222222222222');
    effectiveTitle = inqTitle || attentionSource?.title || 'Attention Is All You Need: Transformers & Multi-Head Attention';
    effectiveDescription =
      attentionSource?.description ??
      'The foundational 2017 paper by Vaswani et al. analyzing sequence modeling, recurrence elimination, and self-attention mechanisms.';
    effectiveContent =
      attentionSource?.content ??
      `The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.
Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions.
In the decoder, the self-attention sub-layer is modified to prevent positions from attending to subsequent positions. This masking, combined with the fact that output embeddings are offset by one position, ensures that predictions for position i can depend only on known outputs at positions less than i.`;
  } else if (isArenaQuestion) {
    const arenaSource = await findLearningSourceById(client, '11111111-1111-4111-8111-111111111111');
    effectiveTitle = inqTitle || arenaSource?.title || 'Memory Arena Allocators: Design and Trade-offs';
    effectiveDescription =
      arenaSource?.description ??
      'A dense walkthrough of arena/bump allocators, free-list strategies, and the fragmentation trade-offs systems engineers accept when they trade general-purpose malloc for a custom allocator.';
    effectiveContent =
      arenaSource?.content ??
      `Arena allocation trades flexibility for throughput. Instead of tracking individual block metadata the way a general-purpose allocator does, an arena allocator reserves one contiguous region up front and satisfies allocations by advancing a single bump pointer. Freeing is batched: the whole arena is reset or released at once, never per-object.`;
  } else {
    // Isolated, dedicated context for this specific technical inquiry
    const topicHeading = inqTitle || input.question.slice(0, 80);
    effectiveTitle = topicHeading;
    effectiveDescription = `First-principles technical analysis and systems mechanics for: ${topicHeading}`;
    effectiveContent = `Domain: Computer Science, Software Engineering, AI & Systems Architecture.
Topic: ${topicHeading}
Learner Question: ${input.question}

Foundational Analysis:
Analyze the fundamental mechanisms, algorithmic invariants, architectural trade-offs, and failure domains for ${topicHeading}.
All follow-up questions must be strictly, uniquely focused on ${topicHeading}.`;
  }
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
    question: input.question,
    sourceTitle: effectiveTitle,
    sourceDescription: effectiveDescription,
    sourceContent: effectiveContent,
    researchMode: input.researchMode,
    learnerHypothesis: input.learnerHypothesis,
  });
  const id = await createNodeAtomically(getAdminClient(), {
    userId, inquiryId, parentNodeId: input.parentNodeId ?? null,
    selectedFollowUpId: input.selectedFollowUpId ?? null, question: input.question,
    explanation: generated.explanation, researchMode: input.researchMode,
    isTrap: generated.isTrap, trapMetadata: generated.trapMetadata,
    followUps: generated.followUps,
    learnerHypothesis: input.learnerHypothesis ?? null,
    timeToFormulationMs: input.timeToFormulationMs ?? null,
    masteryStatus: generated.isTrap ? 'challenged' : 'tentative',
    contrastiveOptions: generated.contrastiveOptions ?? null,
  });
  const created = (await listNodesForInquiry(client, inquiryId)).find((node) => node.id === id);
  if (!created) throw new Error('Created node could not be reloaded');
  return created;
}

export async function getPrerequisiteProbeForInquiry(
  accessToken: string,
  userId: string,
  inquiryId: string,
  conceptTopic: string,
  researchMode: boolean = false,
): Promise<{ probePrompt: string; targetConcept: string; prerequisiteContext?: string }> {
  const client = createRequestScopedClient(accessToken);
  const inquiry = await findInquiryByIdForUser(client, inquiryId, userId);
  if (!inquiry) throw new ApiError(404, 'inquiry_not_found', 'Inquiry not found');

  const source = await findLearningSourceById(client, inquiry.learningSourceId);
  const effectiveTitle = inquiry.title || source?.title || conceptTopic;
  const effectiveContent = source?.content || `Domain: Systems, Algorithms & AI. Topic: ${conceptTopic}`;

  return generatePrerequisiteProbe({
    conceptTopic,
    sourceTitle: effectiveTitle,
    sourceContent: effectiveContent,
    researchMode,
  });
}

export async function submitTrapAttempt(
  accessToken: string,
  userId: string,
  nodeId: string,
  submission: string | { selectedOptionId: string; citationSpan: string; justification: string },
) {
  const client = createRequestScopedClient(accessToken);
  const { data, error } = await client.from('question_nodes')
    .select('id, inquiry_id, is_trap, trap_metadata, trap_resolved_at, contrastive_options, inquiries!inner(user_id, learning_source_id)')
    .eq('id', nodeId).eq('inquiries.user_id', userId).maybeSingle();
  if (error) throw new Error(`Failed to load trap: ${error.message}`);
  if (!data || !data.is_trap || !data.trap_metadata) throw new ApiError(404, 'trap_not_found', 'Trap not found');
  if (data.trap_resolved_at) throw new ApiError(409, 'trap_already_resolved', 'This trap has already been resolved.');
  if (!isSupabaseAdminConfigured()) throw new ApiError(503, 'admin_database_not_configured', 'Set SUPABASE_SERVICE_ROLE_KEY in apps/api/.env.local to resolve traps.');

  let evaluation: { survived: boolean; feedback: string };

  if (typeof submission === 'object' && submission.selectedOptionId && data.contrastive_options) {
    const inquiryData = data.inquiries as unknown as { learning_source_id?: string };
    const learningSource = inquiryData?.learning_source_id
      ? await findLearningSourceById(client, inquiryData.learning_source_id)
      : null;
    const sourceContent = learningSource?.content || '';

    evaluation = await evaluateContrastiveTrap({
      selectedOptionId: submission.selectedOptionId,
      citationSpan: submission.citationSpan,
      justification: submission.justification,
      options: data.contrastive_options as Array<{ id: string; text: string; isFlawed: boolean; axiomViolated?: string }>,
      sourceContent,
    });
  } else {
    const metadata = data.trap_metadata as { scenario?: unknown };
    if (typeof metadata.scenario !== 'string') throw new ApiError(422, 'invalid_trap_data', 'Trap metadata is incomplete.');
    const textResponse = typeof submission === 'string' ? submission : submission.justification;
    evaluation = await evaluateTrap(textResponse, metadata.scenario);
  }

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

  const tailoredSource = {
    ...source,
    title: inquiry.title || source.title,
  };

  return { id: inquiry.id, learningSource: tailoredSource, nodes };
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
