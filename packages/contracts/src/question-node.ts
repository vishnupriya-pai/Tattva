import { z } from 'zod';

export const masteryStatusSchema = z.enum(['tentative', 'challenged', 'conquered']);
export type MasteryStatus = z.infer<typeof masteryStatusSchema>;

export const learnerHypothesisSubmissionSchema = z.object({
  hypothesis: z.string().trim().min(1).max(5000),
  timeToFormulationMs: z.number().int().min(0).optional(),
});
export type LearnerHypothesisSubmission = z.infer<typeof learnerHypothesisSubmissionSchema>;

export const contrastiveOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  isFlawed: z.boolean(),
  axiomViolated: z.string().nullable().optional(),
});
export type ContrastiveOption = z.infer<typeof contrastiveOptionSchema>;

export const contrastiveTrapSubmissionSchema = z.object({
  selectedOptionId: z.string().min(1),
  citationSpan: z.string().trim().min(1),
  justification: z.string().trim().min(1).max(5000),
});
export type ContrastiveTrapSubmission = z.infer<typeof contrastiveTrapSubmissionSchema>;

export const prerequisiteProbeRequestSchema = z.object({
  conceptTopic: z.string().trim().min(1).max(1000),
  parentNodeId: z.string().uuid().nullable().optional(),
  inquiryId: z.string().uuid(),
  researchMode: z.boolean().default(false),
});
export type PrerequisiteProbeRequest = z.infer<typeof prerequisiteProbeRequestSchema>;

export const prerequisiteProbeResponseSchema = z.object({
  data: z.object({
    probePrompt: z.string().min(1),
    targetConcept: z.string().min(1),
    prerequisiteContext: z.string().optional(),
  }),
});
export type PrerequisiteProbeResponse = z.infer<typeof prerequisiteProbeResponseSchema>;

export const codeChallengeSchema = z.object({
  prompt: z.string(),
  starterCode: z.string(),
  testCode: z.string(),
  language: z.enum(['python', 'javascript']).default('python'),
});
export type CodeChallenge = z.infer<typeof codeChallengeSchema>;

export const cognitiveTelemetrySchema = z.object({
  keystrokeCount: z.number().int().min(0).default(0),
  pasteEvents: z.number().int().min(0).default(0),
  maxPastedLength: z.number().int().min(0).default(0),
  formulationDurationMs: z.number().int().min(0).default(0),
  clientIntegrityScore: z.number().min(0).max(1).default(1.0),
});
export type CognitiveTelemetry = z.infer<typeof cognitiveTelemetrySchema>;

export const proofOfStruggleMetadataSchema = z.object({
  basePoints: z.number().int(),
  trapMultiplier: z.number(),
  revisionMultiplier: z.number(),
  telemetryMultiplier: z.number(),
  finalPoints: z.number().int(),
  keystrokes: z.number().int().optional(),
  formulationMs: z.number().int().optional(),
  penaltiesApplied: z.array(z.string()).optional(),
  verifiedAt: z.string().optional(),
});
export type ProofOfStruggleMetadata = z.infer<typeof proofOfStruggleMetadataSchema>;

export const createQuestionNodeRequestSchema = z.object({
  question: z.string().trim().min(1).max(6000),
  parentNodeId: z.string().uuid().nullable().optional(),
  selectedFollowUpId: z.string().uuid().nullable().optional(),
  researchMode: z.boolean().default(false),
  learnerHypothesis: z.string().trim().max(5000).optional(),
  timeToFormulationMs: z.number().int().min(0).optional(),
  telemetry: cognitiveTelemetrySchema.optional(),
}).superRefine((value, ctx) => {
  if (value.selectedFollowUpId && !value.parentNodeId) {
    ctx.addIssue({ code: 'custom', path: ['parentNodeId'], message: 'A selected follow-up requires its parent node' });
  }
});
export type CreateQuestionNodeRequest = z.infer<typeof createQuestionNodeRequestSchema>;

export const generatedQuestionNodeSchema = z.object({
  explanation: z.string().trim().min(1),
  followUps: z.array(z.string().trim().min(1)).length(3),
  isTrap: z.boolean(),
  trapMetadata: z.object({
    misconceptionType: z.string().min(1),
    scenario: z.string().min(1),
    resolutionRequired: z.boolean(),
  }).nullable(),
  contrastiveOptions: z.array(contrastiveOptionSchema).nullable().optional(),
  codeChallenge: codeChallengeSchema.nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.isTrap && !value.trapMetadata) {
    ctx.addIssue({ code: 'custom', path: ['trapMetadata'], message: 'Trap nodes require trap metadata' });
  }
  if (!value.isTrap && value.trapMetadata) {
    ctx.addIssue({ code: 'custom', path: ['trapMetadata'], message: 'Non-trap nodes cannot include trap metadata' });
  }
  if (value.trapMetadata && !value.trapMetadata.resolutionRequired) {
    ctx.addIssue({ code: 'custom', path: ['trapMetadata', 'resolutionRequired'], message: 'Trap resolution must be required' });
  }
});

export const trapAttemptRequestSchema = z.union([
  z.object({
    response: z.string().trim().min(1).max(5000),
    telemetry: cognitiveTelemetrySchema.optional(),
  }),
  contrastiveTrapSubmissionSchema.extend({
    telemetry: cognitiveTelemetrySchema.optional(),
  }),
]);
export type TrapAttemptRequest = z.infer<typeof trapAttemptRequestSchema>;

export const trapAttemptResponseSchema = z.object({
  data: z.discriminatedUnion('result', [
    z.object({ result: z.literal('survived'), trapResolvedAt: z.string(), staminaAwarded: z.null() }),
    z.object({ result: z.literal('retry'), feedback: z.string().min(1) }),
  ]),
});

export const staminaTransactionSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string(),
  basePoints: z.number().int(),
  multiplier: z.number(),
  finalPoints: z.number().int(),
  createdAt: z.string(),
  proofOfStruggleMetadata: proofOfStruggleMetadataSchema.nullable().optional(),
  transactionSignature: z.string().nullable().optional(),
});
export type StaminaTransactionItem = z.infer<typeof staminaTransactionSchema>;

export const staminaResponseSchema = z.object({
  data: z.object({
    balance: z.number().int(),
    recentTransactions: z.array(staminaTransactionSchema),
    streakDays: z.number().int().min(0),
    conqueredInquiryIds: z.array(z.string().uuid()),
  }),
});
export type StaminaResponse = z.infer<typeof staminaResponseSchema>;

/** Contracts for persisted graph nodes and their generated follow-up questions. */
export const trapMetadataSchema = z.object({
  misconceptionType: z.string(),
  scenario: z.string(),
  resolutionRequired: z.boolean(),
});

export const followUpQuestionSchema = z.object({
  id: z.string().uuid(),
  position: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  questionText: z.string(),
  isSelected: z.boolean(),
  childNodeId: z.string().uuid().nullable(),
});

export const questionNodeSchema = z.object({
  id: z.string().uuid(),
  parentNodeId: z.string().uuid().nullable(),
  userQuestion: z.string(),
  aiExplanation: z.string(),
  researchMode: z.boolean(),
  isTrap: z.boolean(),
  trapMetadata: trapMetadataSchema.nullable(),
  trapResolvedAt: z.string().nullable(),
  followUps: z.array(followUpQuestionSchema),
  createdAt: z.string(),
  // Socratic Crucible properties
  learnerHypothesis: z.string().nullable().optional(),
  hypothesisSubmittedAt: z.string().nullable().optional(),
  timeToFormulationMs: z.number().int().nullable().optional(),
  masteryStatus: masteryStatusSchema.default('tentative'),
  contrastiveOptions: z.array(contrastiveOptionSchema).nullable().optional(),
  codeChallenge: codeChallengeSchema.nullable().optional(),
});

export const createQuestionNodeResponseSchema = z.object({
  data: z.object({ node: questionNodeSchema, staminaAwarded: z.null() }),
});

export type TrapMetadata = z.infer<typeof trapMetadataSchema>;
export type FollowUpQuestion = z.infer<typeof followUpQuestionSchema>;
export type QuestionNode = z.infer<typeof questionNodeSchema>;
export type CreateQuestionNodeResponse = z.infer<typeof createQuestionNodeResponseSchema>;
export type TrapAttemptResponse = z.infer<typeof trapAttemptResponseSchema>;
