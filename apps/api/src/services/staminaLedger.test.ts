import { describe, expect, it } from 'vitest';
import { calculateStaminaMinting } from './staminaLedger';

describe('Proof-of-Struggle Cognitive Stamina Minting', () => {
  it('awards full cognitive credit and HMAC signature for honest, thoughtful formulation', () => {
    const result = calculateStaminaMinting({
      userId: '11111111-1111-4111-8111-111111111111',
      inquiryId: '22222222-2222-4222-8222-222222222222',
      nodeId: '33333333-3333-4333-8333-333333333333',
      eventType: 'hypothesis_formulated',
      researchMode: true,
      learnerHypothesis: 'Without scaling the dot products by sqrt(d_k), large key dimensions cause softmax gradients to vanish in extreme tails.',
      timeToFormulationMs: 25000,
      keystrokeCount: 130,
      pasteEvents: 0,
    });

    expect(result.basePoints).toBe(30);
    expect(result.trapMultiplier).toBe(2.5); // Research mode 2.5x
    expect(result.revisionMultiplier).toBe(1.5); // Deep deliberation (>80 chars, >12s)
    expect(result.telemetryMultiplier).toBe(1.0); // No penalties
    expect(result.finalPoints).toBe(113); // 30 * 2.5 * 1.5 * 1.0 = 112.5 -> 113
    expect(result.signature).toBeDefined();
    expect(result.signature.length).toBe(64); // SHA-256 hex string
    expect(result.metadata.penaltiesApplied).toEqual([]);
  });

  it('penalizes instant unassisted clipboard paste injections to 0 points', () => {
    const result = calculateStaminaMinting({
      userId: '11111111-1111-4111-8111-111111111111',
      inquiryId: '22222222-2222-4222-8222-222222222222',
      nodeId: '33333333-3333-4333-8333-333333333333',
      eventType: 'hypothesis_formulated',
      researchMode: false,
      learnerHypothesis: 'This is a long pasted block from ChatGPT that the user copied and submitted in 1 second.',
      timeToFormulationMs: 1200, // < 3000ms
      keystrokeCount: 2,
      pasteEvents: 1,
      maxPastedLength: 95,
    });

    expect(result.telemetryMultiplier).toBe(0.0);
    expect(result.finalPoints).toBe(0);
    expect(result.metadata.penaltiesApplied).toContain('instant_unassisted_paste_detected');
  });

  it('awards trap survival points with adversarial multiplier', () => {
    const result = calculateStaminaMinting({
      userId: '11111111-1111-4111-8111-111111111111',
      inquiryId: '22222222-2222-4222-8222-222222222222',
      nodeId: '33333333-3333-4333-8333-333333333333',
      eventType: 'trap_survived',
      researchMode: false,
      isTrap: true,
      timeToFormulationMs: 18000,
    });

    expect(result.basePoints).toBe(50);
    expect(result.trapMultiplier).toBe(2.0);
    expect(result.finalPoints).toBe(100);
    expect(result.signature).toBeDefined();
  });
});
