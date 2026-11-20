import { describe, expect, it } from 'vitest';
import {
  masteryStatusSchema,
  learnerHypothesisSubmissionSchema,
  contrastiveOptionSchema,
  contrastiveTrapSubmissionSchema,
  prerequisiteProbeRequestSchema,
  prerequisiteProbeResponseSchema,
  codeChallengeSchema,
  questionNodeSchema,
  createQuestionNodeRequestSchema,
  cognitiveTelemetrySchema,
  proofOfStruggleMetadataSchema,
  staminaResponseSchema,
  conceptDagSchema,
  ingestDocumentRequestSchema,
} from './index';

describe('Socratic Crucible Contracts', () => {
  it('validates mastery statuses', () => {
    expect(masteryStatusSchema.parse('tentative')).toBe('tentative');
    expect(masteryStatusSchema.parse('challenged')).toBe('challenged');
    expect(masteryStatusSchema.parse('conquered')).toBe('conquered');
    expect(() => masteryStatusSchema.parse('invalid')).toThrow();
  });

  it('validates learner hypothesis submissions', () => {
    const valid = {
      hypothesis: 'Attention without scaling causes variance to grow linearly with d_k, pushing softmax into saturation.',
      timeToFormulationMs: 42000,
    };
    const parsed = learnerHypothesisSubmissionSchema.parse(valid);
    expect(parsed.hypothesis).toBe(valid.hypothesis);
    expect(parsed.timeToFormulationMs).toBe(42000);
  });

  it('validates contrastive trap submissions', () => {
    const valid = {
      selectedOptionId: 'opt-flawed-1',
      citationSpan: 'Vaswani et al. (2017) Section 3.2.1',
      justification: 'The claim ignores the division by sqrt(d_k) which prevents gradient saturation.',
    };
    const parsed = contrastiveTrapSubmissionSchema.parse(valid);
    expect(parsed.selectedOptionId).toBe('opt-flawed-1');
  });

  it('validates prerequisite probe requests and responses', () => {
    const req = {
      conceptTopic: 'Scaled Dot-Product Attention',
      inquiryId: '11111111-1111-4111-8111-111111111111',
      researchMode: true,
    };
    expect(prerequisiteProbeRequestSchema.parse(req).conceptTopic).toBe('Scaled Dot-Product Attention');

    const res = {
      data: {
        probePrompt: 'Why does inner product magnitude scale with vector dimension?',
        targetConcept: 'Dimensional Scaling Factor',
      },
    };
    expect(prerequisiteProbeResponseSchema.parse(res).data.probePrompt).toBeDefined();
  });

  it('validates questionNode with Socratic extensions', () => {
    const node = {
      id: '22222222-2222-4222-8222-222222222222',
      parentNodeId: null,
      userQuestion: 'How does self-attention differ from recurrence?',
      aiExplanation: 'Self-attention processes tokens in parallel without recurrence bottlenecks.',
      researchMode: false,
      isTrap: false,
      trapMetadata: null,
      trapResolvedAt: null,
      followUps: [
        { id: '33333333-3333-4333-8333-333333333331', position: 1, questionText: 'Q1', isSelected: false, childNodeId: null },
        { id: '33333333-3333-4333-8333-333333333332', position: 2, questionText: 'Q2', isSelected: false, childNodeId: null },
        { id: '33333333-3333-4333-8333-333333333333', position: 3, questionText: 'Q3', isSelected: false, childNodeId: null },
      ],
      createdAt: '2026-11-17T08:00:00.000Z',
      learnerHypothesis: 'Sequential computation limits GPU parallelism.',
      masteryStatus: 'conquered',
    };

    const parsed = questionNodeSchema.parse(node);
    expect(parsed.masteryStatus).toBe('conquered');
    expect(parsed.learnerHypothesis).toBe('Sequential computation limits GPU parallelism.');
  });

  it('validates cognitive telemetry and proof-of-struggle metadata schemas', () => {
    const telemetry = {
      keystrokeCount: 145,
      pasteEvents: 0,
      maxPastedLength: 0,
      formulationDurationMs: 38500,
      clientIntegrityScore: 1.0,
    };
    const parsedTelemetry = cognitiveTelemetrySchema.parse(telemetry);
    expect(parsedTelemetry.keystrokeCount).toBe(145);
    expect(parsedTelemetry.clientIntegrityScore).toBe(1.0);

    const pos = {
      basePoints: 30,
      trapMultiplier: 2.0,
      revisionMultiplier: 1.5,
      telemetryMultiplier: 1.0,
      finalPoints: 90,
      keystrokes: 145,
      formulationMs: 38500,
      penaltiesApplied: [],
      verifiedAt: '2026-11-17T15:00:00.000Z',
    };
    const parsedPos = proofOfStruggleMetadataSchema.parse(pos);
    expect(parsedPos.finalPoints).toBe(90);

    const staminaRes = {
      data: {
        balance: 140,
        recentTransactions: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            eventType: 'hypothesis_verified',
            basePoints: 30,
            multiplier: 3.0,
            finalPoints: 90,
            createdAt: '2026-11-17T15:00:00.000Z',
            proofOfStruggleMetadata: pos,
            transactionSignature: 'abcdef0123456789',
          },
        ],
        streakDays: 4,
        conqueredInquiryIds: [],
      },
    };
    const parsedStamina = staminaResponseSchema.parse(staminaRes);
    expect(parsedStamina.data.recentTransactions[0].transactionSignature).toBe('abcdef0123456789');
  });

  it('validates concept DAG and document ingestion schemas', () => {
    const rawDag = {
      rootConceptId: 'matrix-mult',
      concepts: [
        {
          id: 'matrix-mult',
          conceptName: 'Matrix Multiplication & Tiling',
          prerequisiteIds: [],
          summary: 'Foundation of tensor projections.',
          coreQuestion: 'Why does memory bandwidth bottleneck GEMM operations on modern GPUs?',
          isLocked: false,
        },
        {
          id: 'softmax-scale',
          conceptName: 'Softmax Numerical Scaling',
          prerequisiteIds: ['matrix-mult'],
          summary: 'Variance of dot product scales with dimension.',
          coreQuestion: 'Why does dot product variance grow linearly with key dimension d_k?',
          isLocked: true,
        },
      ],
    };
    const parsedDag = conceptDagSchema.parse(rawDag);
    expect(parsedDag.concepts.length).toBe(2);
    expect(parsedDag.concepts[1].isLocked).toBe(true);

    const ingestReq = {
      title: 'FlashAttention: Fast and Memory-Efficient Exact Attention',
      content: '# FlashAttention\n\nTransformers are slow and memory-hungry on long sequences...',
      sourceType: 'document',
    };
    const parsedReq = ingestDocumentRequestSchema.parse(ingestReq);
    expect(parsedReq.title).toContain('FlashAttention');
    expect(parsedReq.durationMinutes).toBe(45);
  });
});
