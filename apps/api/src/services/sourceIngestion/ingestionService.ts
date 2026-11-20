import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IngestDocumentRequest,
  IngestDocumentResponse,
  QuestionNode,
} from '@tattva/contracts';
import { getAdminClient, isSupabaseAdminConfigured } from '../../integrations/supabase/client';
import { createLearningSourceRecord } from '../../repositories/learningSourceRepository';
import { createInquiry } from '../../repositories/inquiryRepository';
import { createNodeAtomically, listNodesForInquiry } from '../../repositories/questionNodeRepository';
import { extractConceptDAG } from '../../integrations/sarvam/client';
import { parseTechnicalDocument } from './markdownParser';

export async function ingestDocumentAndBuildDAG(
  client: SupabaseClient,
  userId: string,
  input: IngestDocumentRequest,
): Promise<IngestDocumentResponse['data']> {
  const adminClient = isSupabaseAdminConfigured() ? getAdminClient() : client;

  // 1. Parse document structure
  const sections = parseTechnicalDocument(input.content);
  const derivedDescription =
    input.description ||
    sections[0]?.content.slice(0, 280) ||
    `Technical specification for ${input.title}`;

  // 2. Persist new learning source
  const learningSource = await createLearningSourceRecord(adminClient, {
    title: input.title,
    description: derivedDescription,
    content: input.content,
    sourceType: input.sourceType,
    sourceReference: input.sourceReference || 'User Uploaded Technical Paper / RFC',
    durationMinutes: input.durationMinutes || 45,
  });

  // 3. Create the inquiry for the user
  const inquiry = await createInquiry(client, userId, learningSource.id, input.title);

  // 4. Extract Prerequisite Concept DAG using Sarvam AI
  const dag = await extractConceptDAG(input.title, input.content);

  // 5. Seed the foundational precursor concept as the initial root node on the canvas
  const rootConcept =
    dag.concepts.find((c) => c.id === dag.rootConceptId) ||
    dag.concepts[0] || {
      id: 'root-foundation',
      conceptName: input.title,
      summary: derivedDescription,
      coreQuestion: `What foundational architectural principle governs ${input.title}?`,
      prerequisiteIds: [],
      isLocked: false,
    };

  const followUpConcepts = dag.concepts.slice(1, 4);
  const followUps = followUpConcepts.map((c) => c.coreQuestion);

  // Fill up to 3 follow-ups if less than 3
  while (followUps.length < 3) {
    followUps.push(
      followUps.length === 1
        ? `What hardware or memory constraint limits the performance of ${input.title}?`
        : `How does ${input.title} compare to alternative baseline approaches?`,
    );
  }

  try {
    await createNodeAtomically(client, {
      userId,
      inquiryId: inquiry.id,
      parentNodeId: null,
      selectedFollowUpId: null,
      question: rootConcept.coreQuestion,
      explanation: `**${rootConcept.conceptName}**: ${rootConcept.summary}\n\n${rootConcept.sourceSpan ? `> *"${rootConcept.sourceSpan}"*\n\n` : ''}This foundational concept forms the prerequisite baseline for unlocking the subsequent mechanisms in ${input.title}.`,
      researchMode: false,
      isTrap: false,
      trapMetadata: null,
      followUps,
      masteryStatus: 'tentative',
    });
  } catch (err) {
    // If node creation encounters conflict, continue to return inquiry
  }

  // 6. Fetch seeded nodes to return full state
  let nodes: QuestionNode[] = [];
  try {
    nodes = await listNodesForInquiry(client, inquiry.id);
  } catch {
    nodes = [];
  }

  return {
    inquiry,
    learningSource,
    dag,
    nodes,
  };
}
