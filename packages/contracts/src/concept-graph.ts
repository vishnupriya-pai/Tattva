import { z } from 'zod';

/**
 * Concept layer of the Knowledge Graph (docs/DATABASE.md §3.6–3.8).
 *
 * Question nodes stay a tree (the learning path). Concepts are canonical ideas
 * shared across that tree: a question MENTIONS concepts, and concepts relate to
 * each other through typed edges. Two questions on different branches that
 * share a concept are therefore connected, which is what the analytics layer
 * builds on.
 */

export const CONCEPT_ROLES = ['defines', 'uses', 'contrasts', 'misconceives'] as const;
export const conceptRoleSchema = z.enum(CONCEPT_ROLES);
export type ConceptRole = z.infer<typeof conceptRoleSchema>;

export const CONCEPT_RELATION_TYPES = [
  'PREREQUISITE_OF',
  'CAUSES',
  'TRADES_OFF_WITH',
  'CONTRASTS_WITH',
  'GENERALIZES',
  'INSTANCE_OF',
] as const;
export const conceptRelationTypeSchema = z.enum(CONCEPT_RELATION_TYPES);
export type ConceptRelationType = z.infer<typeof conceptRelationTypeSchema>;

export const CONCEPT_EDGE_ORIGINS = ['model', 'predicted', 'learner'] as const;
export const conceptEdgeOriginSchema = z.enum(CONCEPT_EDGE_ORIGINS);

export const conceptSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  aliases: z.array(z.string()),
  createdAt: z.string(),
});

export const nodeConceptSchema = z.object({
  questionNodeId: z.string().uuid(),
  conceptId: z.string().uuid(),
  role: conceptRoleSchema,
  weight: z.number().min(0).max(1),
});

export const conceptEdgeSchema = z.object({
  id: z.string().uuid(),
  sourceConceptId: z.string().uuid(),
  targetConceptId: z.string().uuid(),
  relationType: conceptRelationTypeSchema,
  justification: z.string(),
  origin: conceptEdgeOriginSchema,
  /** 0–1; grows each time an independent node re-asserts the same edge. */
  confidence: z.number().min(0).max(1),
  /** The question node whose generation first asserted this edge, if any. */
  sourceNodeId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export const conceptGraphSchema = z.object({
  concepts: z.array(conceptSchema),
  nodeConcepts: z.array(nodeConceptSchema),
  conceptEdges: z.array(conceptEdgeSchema),
});

export type Concept = z.infer<typeof conceptSchema>;
export type NodeConcept = z.infer<typeof nodeConceptSchema>;
export type ConceptEdge = z.infer<typeof conceptEdgeSchema>;
export type ConceptGraph = z.infer<typeof conceptGraphSchema>;

/** POST /api/v1/inquiries/:inquiryId/connections/discover (docs/API_CONTRACTS.md §3b). */
export const discoverConnectionsResponseSchema = z.object({
  data: z.object({
    /** Newly stored, model-verified edges (origin = 'predicted'). */
    added: z.array(conceptEdgeSchema),
    /** Candidate pairs the verifier rejected; remembered and never re-proposed. */
    rejectedCount: z.number().int().min(0),
    /** Candidate pairs sent for verification. 0 means the graph offered no new candidates. */
    consideredCount: z.number().int().min(0),
  }),
});
export type DiscoverConnectionsResponse = z.infer<typeof discoverConnectionsResponseSchema>;
