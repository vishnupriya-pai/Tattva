import { z } from 'zod';

export const createQuestionNodeRequestSchema = z.object({
  question: z.string().trim().min(1).max(6000),
  parentNodeId: z.string().uuid().nullable().optional(),
  selectedFollowUpId: z.string().uuid().nullable().optional(),
  researchMode: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (value.selectedFollowUpId && !value.parentNodeId) {
    ctx.addIssue({ code: 'custom', path: ['parentNodeId'], message: 'A selected follow-up requires its parent node' });
  }
});
export type CreateQuestionNodeRequest = z.infer<typeof createQuestionNodeRequestSchema>;

export const generatedQuestionNodeSchema = z.object({
  explanation: z.string().trim().min(1).max(4000),
  followUps: z.array(z.string().trim().min(1)).length(3),
  isTrap: z.boolean(),
  trapMetadata: z.object({
    misconceptionType: z.string().min(1),
    scenario: z.string().min(1),
    resolutionRequired: z.boolean(),
  }).nullable(),
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

export const trapAttemptRequestSchema = z.object({ response: z.string().trim().min(1).max(5000) });
export const trapAttemptResponseSchema = z.object({
  data: z.discriminatedUnion('result', [
    z.object({ result: z.literal('survived'), trapResolvedAt: z.string(), staminaAwarded: z.null() }),
    z.object({ result: z.literal('retry'), feedback: z.string().min(1) }),
  ]),
});
export const staminaResponseSchema = z.object({ data: z.object({
  balance: z.number().int(),
  recentTransactions: z.array(z.object({
    id: z.string().uuid(), eventType: z.string(), basePoints: z.number().int(), multiplier: z.number(), finalPoints: z.number().int(), createdAt: z.string(),
  })),
  streakDays: z.number().int().min(0),
  conqueredInquiryIds: z.array(z.string().uuid()),
}) });
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
});

export const createQuestionNodeResponseSchema = z.object({
  data: z.object({ node: questionNodeSchema, staminaAwarded: z.null() }),
});

export type TrapMetadata = z.infer<typeof trapMetadataSchema>;
export type FollowUpQuestion = z.infer<typeof followUpQuestionSchema>;
export type QuestionNode = z.infer<typeof questionNodeSchema>;
export type CreateQuestionNodeResponse = z.infer<typeof createQuestionNodeResponseSchema>;
export type TrapAttemptResponse = z.infer<typeof trapAttemptResponseSchema>;
