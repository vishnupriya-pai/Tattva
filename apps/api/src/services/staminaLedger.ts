import { createHmac } from 'node:crypto';
import type { ProofOfStruggleMetadata } from '@tattva/contracts';

export interface StruggleCalculationInput {
  userId: string;
  inquiryId: string;
  nodeId: string;
  eventType: 'hypothesis_formulated' | 'trap_survived' | 'inquiry_conquered';
  researchMode: boolean;
  learnerHypothesis?: string | null;
  timeToFormulationMs?: number | null;
  isTrap?: boolean;
  keystrokeCount?: number;
  pasteEvents?: number;
  maxPastedLength?: number;
}

export interface StruggleCalculationResult {
  basePoints: number;
  trapMultiplier: number;
  revisionMultiplier: number;
  telemetryMultiplier: number;
  finalPoints: number;
  metadata: ProofOfStruggleMetadata;
  signature: string;
}

const SIGNING_SECRET =
  process.env.STAMINA_SIGNING_SECRET ||
  process.env.SARVAM_API_KEY ||
  'tattva-proof-of-struggle-immutable-ledger-secret';

/**
 * Computes cryptographically verified cognitive stamina based on
 * genuine intellectual struggle, anti-cheat telemetry, and problem complexity.
 *
 * Formula:
 * Final Stamina = Base Points * M_trap * M_revision * M_telemetry
 */
export function calculateStaminaMinting(input: StruggleCalculationInput): StruggleCalculationResult {
  let basePoints = 30;
  let trapMultiplier = 1.0;
  let revisionMultiplier = 1.0;
  let telemetryMultiplier = 1.0;
  const penalties: string[] = [];

  // 1. Base Points & Trap Multiplier
  if (input.eventType === 'trap_survived') {
    basePoints = 50;
    trapMultiplier = input.researchMode ? 2.5 : 2.0;
  } else if (input.eventType === 'inquiry_conquered') {
    basePoints = 100;
    trapMultiplier = input.researchMode ? 2.5 : 1.5;
  } else {
    // hypothesis_formulated
    basePoints = input.learnerHypothesis && input.learnerHypothesis.trim().length > 0 ? 30 : 5;
    trapMultiplier = input.researchMode ? 2.5 : 1.0;
  }

  // 2. Formulation / Deliberation Quality Multiplier (M_revision)
  const hypothesisLen = (input.learnerHypothesis ?? '').trim().length;
  const durationMs = input.timeToFormulationMs ?? 0;

  if (input.eventType === 'trap_survived' || input.eventType === 'inquiry_conquered') {
    revisionMultiplier = 1.0;
  } else if (hypothesisLen >= 80 && durationMs >= 12000) {
    revisionMultiplier = 1.5; // Deep deliberation bonus
  } else if (hypothesisLen >= 30 && durationMs >= 5000) {
    revisionMultiplier = 1.2; // Thoughtful formulation
  } else if (hypothesisLen > 0) {
    revisionMultiplier = 1.0;
  } else {
    revisionMultiplier = 0.5; // Minimal or absent hypothesis
  }

  // 3. Telemetry Anti-Cheat Penalty (M_telemetry)
  const pastedLen = input.maxPastedLength ?? 0;
  const isInstantPaste = durationMs < 3000 && hypothesisLen > 60;

  if (isInstantPaste) {
    telemetryMultiplier = 0.0;
    penalties.push('instant_unassisted_paste_detected');
  } else if (pastedLen > 100) {
    telemetryMultiplier = 0.5;
    penalties.push('large_external_clipboard_injection');
  } else if (pastedLen > 40) {
    telemetryMultiplier = 0.75;
    penalties.push('partial_clipboard_paste');
  } else {
    telemetryMultiplier = 1.0;
  }

  const finalPoints = Math.round(
    basePoints * trapMultiplier * revisionMultiplier * telemetryMultiplier,
  );

  const metadata: ProofOfStruggleMetadata = {
    basePoints,
    trapMultiplier: Number(trapMultiplier.toFixed(2)),
    revisionMultiplier: Number(revisionMultiplier.toFixed(2)),
    telemetryMultiplier: Number(telemetryMultiplier.toFixed(2)),
    finalPoints,
    keystrokes: input.keystrokeCount,
    formulationMs: durationMs,
    penaltiesApplied: penalties,
    verifiedAt: new Date().toISOString(),
  };

  // HMAC-SHA256 signature guarantees untampered ledger certification
  const signature = createHmac('sha256', SIGNING_SECRET)
    .update(`${input.userId}:${input.inquiryId}:${input.nodeId}:${input.eventType}:${finalPoints}:${JSON.stringify(metadata)}`)
    .digest('hex');

  return {
    basePoints,
    trapMultiplier,
    revisionMultiplier,
    telemetryMultiplier,
    finalPoints,
    metadata,
    signature,
  };
}
