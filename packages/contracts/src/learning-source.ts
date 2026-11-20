import { z } from 'zod';

/**
 * Contract for the curated `learning_sources` row, as embedded in
 * GET /api/v1/inquiries/:inquiryId (docs/API_CONTRACTS.md §3,
 * docs/DATABASE.md §3.1). The hackathon MVP never writes this table from
 * the API — rows are seeded only — so no create/update schema exists here.
 */
export const sourceTypeSchema = z.enum(['video', 'document', 'transcript']);

export const learningSourceSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  content: z.string(),
  sourceType: sourceTypeSchema,
  sourceReference: z.string(),
  durationMinutes: z.number().int().min(25),
});

export type LearningSourceSummary = z.infer<typeof learningSourceSummarySchema>;

export const conceptDependencySchema = z.object({
  id: z.string().min(1),
  conceptName: z.string().min(1),
  prerequisiteIds: z.array(z.string()),
  summary: z.string().min(1),
  coreQuestion: z.string().min(1),
  sourceSpan: z.string().optional(),
  isLocked: z.boolean().default(false),
});
export type ConceptDependency = z.infer<typeof conceptDependencySchema>;

export const conceptDagSchema = z.object({
  concepts: z.array(conceptDependencySchema),
  rootConceptId: z.string(),
});
export type ConceptDAG = z.infer<typeof conceptDagSchema>;

export const ingestDocumentRequestSchema = z.object({
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().max(1000).optional(),
  content: z.string().trim().min(50).max(100000),
  sourceType: sourceTypeSchema.default('document'),
  sourceReference: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(25).default(45),
});
export type IngestDocumentRequest = z.infer<typeof ingestDocumentRequestSchema>;
