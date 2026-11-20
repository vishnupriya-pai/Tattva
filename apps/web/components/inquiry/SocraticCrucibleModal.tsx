'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Brain,
  Sparkles,
  ArrowRight,
  Loader2,
  X,
  Clock,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { getPrerequisiteProbe } from '../../lib/api-client';
import { useCognitiveTelemetry } from '../../lib/telemetry';
import type { CognitiveTelemetry } from '@tattva/contracts';

interface SocraticCrucibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetQuestion: string;
  parentNodeId: string | null;
  selectedFollowUpId: string | null;
  inquiryId: string;
  researchMode: boolean;
  onSubmitHypothesis: (
    question: string,
    parentNodeId: string | null,
    selectedFollowUpId: string | null,
    hypothesis: string,
    timeToFormulationMs: number,
    telemetry?: CognitiveTelemetry,
  ) => Promise<void> | void;
}

export const SocraticCrucibleModal: React.FC<SocraticCrucibleModalProps> = ({
  isOpen,
  onClose,
  targetQuestion,
  parentNodeId,
  selectedFollowUpId,
  inquiryId,
  researchMode,
  onSubmitHypothesis,
}) => {
  const [isLoadingProbe, setIsLoadingProbe] = useState(true);
  const [probePrompt, setProbePrompt] = useState<string>('');
  const [targetConcept, setTargetConcept] = useState<string>('');
  const [prerequisiteContext, setPrerequisiteContext] = useState<string | undefined>();
  const [hypothesis, setHypothesis] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    handleKeyDown: onTelemetryKeyDown,
    handlePaste: onTelemetryPaste,
    getTelemetry,
    resetTelemetry,
    pasteWarning: telemetryPasteWarning,
  } = useCognitiveTelemetry();

  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load probe when opened
  useEffect(() => {
    if (!isOpen || !targetQuestion) return;

    let isCancelled = false;
    setIsLoadingProbe(true);
    setErrorMessage(null);
    setHypothesis('');
    resetTelemetry();
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);

    getPrerequisiteProbe(inquiryId, targetQuestion, researchMode)
      .then((res) => {
        if (!isCancelled) {
          setProbePrompt(res.data.probePrompt);
          setTargetConcept(res.data.targetConcept);
          setPrerequisiteContext(res.data.prerequisiteContext);
          setIsLoadingProbe(false);
          startTimeRef.current = Date.now();
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          // Graceful fallback probe if API is momentarily unreachable
          setProbePrompt(
            `Before unlocking the explanation: What fundamental invariant, mathematical constraint, or failure mode does "${targetQuestion}" address? Formulate your intuition.`,
          );
          setTargetConcept(targetQuestion.slice(0, 50));
          setIsLoadingProbe(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, targetQuestion, inquiryId, researchMode]);

  // Elapsed timer ticker
  useEffect(() => {
    if (!isOpen || isLoadingProbe || isSubmitting) return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isLoadingProbe, isSubmitting]);

  if (!isOpen) return null;

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    onTelemetryPaste(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onTelemetryKeyDown(e);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hypothesis.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const timeToFormulationMs = Date.now() - startTimeRef.current;
    const telemetry = getTelemetry();

    try {
      await onSubmitHypothesis(
        targetQuestion,
        parentNodeId,
        selectedFollowUpId,
        hypothesis.trim(),
        timeToFormulationMs,
        telemetry,
      );
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit hypothesis.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#c59a67]/30 bg-[#0e1014] p-6 shadow-2xl shadow-black/80 text-slate-200 space-y-5">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#c59a67]/15 border border-[#c59a67]/40 flex items-center justify-center text-[#c59a67]">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#c59a67] bg-[#c59a67]/10 px-2 py-0.5 rounded border border-[#c59a67]/30">
                  Socratic Inversion
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Friction is the product</span>
              </div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Formulate Your Hypothesis
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoadingProbe ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#c59a67]" />
            <p className="font-mono text-xs text-slate-400">
              Sarvam AI is synthesizing prerequisite tension for: &ldquo;{targetQuestion.slice(0, 45)}…&rdquo;
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* The Prerequisite Probe Challenge Banner */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Prerequisite Probe
                </span>
                <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {elapsedSeconds}s formulation time
                </span>
              </div>

              <p className="text-sm font-medium text-amber-100 leading-relaxed font-sans">
                {probePrompt}
              </p>

              {prerequisiteContext && (
                <p className="text-xs text-amber-300/70 font-mono italic">
                  💡 Hint: {prerequisiteContext}
                </p>
              )}
            </div>

            {/* Target Concept Subtext */}
            <div className="text-xs text-slate-400 flex items-center justify-between font-mono">
              <span>Target Question: <span className="text-slate-200">{targetQuestion}</span></span>
            </div>

            {/* Hypothesis Input Area */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Your Intuition & Reasoning (Required before revealing the proof):
              </label>
              <textarea
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={4}
                required
                placeholder="State your hypothesis in 1-3 sentences. What mechanism or invariant do you predict operates here?"
                className="w-full rounded-xl border border-white/15 bg-[#14171d] px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-[#c59a67] focus:outline-none focus:ring-1 focus:ring-[#c59a67] transition font-sans"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{hypothesis.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>Proof-of-Struggle active &middot; Deliberation earns up to 2.5×</span>
              </div>
            </div>

            {telemetryPasteWarning && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{telemetryPasteWarning}</span>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!hypothesis.trim() || isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#c59a67] px-5 py-2.5 font-mono text-xs font-bold text-black hover:bg-[#d4a373] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/40"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Synthesizing Conceptual Delta…</span>
                  </>
                ) : (
                  <>
                    <span>Submit Hypothesis & Reveal Proof</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
