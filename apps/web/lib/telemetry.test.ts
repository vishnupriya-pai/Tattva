import { describe, expect, it } from 'vitest';
import { createTelemetryTracker } from './telemetry';

describe('Cognitive Telemetry Tracker', () => {
  it('tracks keystroke count excluding modifiers', () => {
    const tracker = createTelemetryTracker();
    tracker.onKeyDown({ key: 'a' } as any);
    tracker.onKeyDown({ key: 'b' } as any);
    tracker.onKeyDown({ key: 'Shift' } as any);
    tracker.onKeyDown({ key: 'c' } as any);

    const metrics = tracker.getTelemetry();
    expect(metrics.keystrokeCount).toBe(3);
    expect(metrics.pasteEvents).toBe(0);
    expect(metrics.clientIntegrityScore).toBe(1.0);
  });

  it('detects paste events and reduces integrity on large blocks', () => {
    const tracker = createTelemetryTracker();
    const fakePasteText = 'A'.repeat(200);
    tracker.onPaste({
      clipboardData: {
        getData: () => fakePasteText,
      },
    } as any);

    const metrics = tracker.getTelemetry();
    expect(metrics.pasteEvents).toBe(1);
    expect(metrics.maxPastedLength).toBe(200);
    expect(metrics.clientIntegrityScore).toBeLessThan(0.5);
  });
});
