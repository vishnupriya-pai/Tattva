import { useState, useRef, useCallback } from 'react';
import type { CognitiveTelemetry } from '@tattva/contracts';

export interface TelemetryTracker {
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  getTelemetry: () => CognitiveTelemetry;
  reset: () => void;
}

/**
 * Creates an in-memory tracker for measuring cognitive friction,
 * typing effort, formulation duration, and paste detection.
 */
export function createTelemetryTracker(): TelemetryTracker {
  let startTime = Date.now();
  let keystrokeCount = 0;
  let pasteEvents = 0;
  let maxPastedLength = 0;

  return {
    onKeyDown(e) {
      // Ignore pure modifiers to measure actual conceptual keystrokes
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;
      keystrokeCount += 1;
    },
    onPaste(e) {
      pasteEvents += 1;
      const text = e.clipboardData.getData('text') || '';
      if (text.length > maxPastedLength) {
        maxPastedLength = text.length;
      }
    },
    getTelemetry(): CognitiveTelemetry {
      const formulationDurationMs = Date.now() - startTime;
      let integrityScore = 1.0;

      // Anti-cheat heuristic: Large pastes or instant submissions reduce integrity
      if (maxPastedLength > 150) {
        integrityScore -= 0.6;
      } else if (maxPastedLength > 50) {
        integrityScore -= 0.3;
      }

      if (formulationDurationMs < 4000 && keystrokeCount < 15 && maxPastedLength > 30) {
        integrityScore = 0.1; // Instant injection
      }

      integrityScore = Math.max(0, Math.min(1, integrityScore));

      return {
        keystrokeCount,
        pasteEvents,
        maxPastedLength,
        formulationDurationMs,
        clientIntegrityScore: Number(integrityScore.toFixed(2)),
      };
    },
    reset() {
      startTime = Date.now();
      keystrokeCount = 0;
      pasteEvents = 0;
      maxPastedLength = 0;
    },
  };
}

/**
 * React hook to track real-time cognitive formulation metrics in modals / inputs.
 */
export function useCognitiveTelemetry() {
  const trackerRef = useRef<TelemetryTracker | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = createTelemetryTracker();
  }

  const [pasteWarning, setPasteWarning] = useState<string | null>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    trackerRef.current?.onKeyDown(e);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    trackerRef.current?.onPaste(e);
    const text = e.clipboardData.getData('text') || '';
    if (text.length > 80) {
      setPasteWarning(
        'Direct text injection detected. Tattva values your unassisted first-principles formulation.',
      );
    }
  }, []);

  const getTelemetry = useCallback((): CognitiveTelemetry => {
    return trackerRef.current ? trackerRef.current.getTelemetry() : {
      keystrokeCount: 0,
      pasteEvents: 0,
      maxPastedLength: 0,
      formulationDurationMs: 0,
      clientIntegrityScore: 1.0,
    };
  }, []);

  const resetTelemetry = useCallback(() => {
    trackerRef.current?.reset();
    setPasteWarning(null);
  }, []);

  return {
    handleKeyDown,
    handlePaste,
    getTelemetry,
    resetTelemetry,
    pasteWarning,
  };
}
