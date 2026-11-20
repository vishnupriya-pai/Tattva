'use client';

import { useId, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';
import type { TrapMetadata, TrapSubmissionState } from '../../lib/workspace-types';

export function TrapPanel({
  trap,
  resolved,
  submissionState,
  feedback,
  contrastiveOptions,
  onSubmit,
}: {
  trap: TrapMetadata;
  resolved: boolean;
  submissionState: TrapSubmissionState;
  feedback?: string;
  contrastiveOptions?: Array<{ id: string; text: string; isFlawed: boolean; axiomViolated?: string }> | null;
  onSubmit: (submission: string | { selectedOptionId: string; citationSpan: string; justification: string }) => void;
}) {
  const [response, setResponse] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [citationSpan, setCitationSpan] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const fieldId = useId();

  if (resolved) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="font-sans font-medium">Socratic Challenge Overcome: Invariant verified & cryptographic proof recorded.</span>
      </div>
    );
  }

  const disabled = submissionState === 'submitting' || submissionState === 'submitted';
  const hasContrastive = Boolean(contrastiveOptions && contrastiveOptions.length >= 2);

  const handleContrastiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId || !justification.trim() || disabled) return;
    onSubmit({
      selectedOptionId,
      citationSpan: citationSpan.trim(),
      justification: justification.trim(),
    });
  };

  const handleLegacySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim() || disabled) return;
    onSubmit(response.trim());
  };

  return (
    <div className="rounded-xl border border-[#c59a67]/40 bg-[#191612]/70 p-4 space-y-3 shadow-lg" role="alert">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#c59a67]/20 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#c59a67] shrink-0" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#c59a67]">
            Socratic Challenge &middot; Invariant Falsification
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#c59a67] bg-[#c59a67]/15 px-2 py-0.5 rounded border border-[#c59a67]/30 font-semibold">
          ACTIVE CHECKPOINT
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-mono text-[#c59a67]/80 uppercase">
          Misconception Under Test: {trap.misconceptionType.replaceAll('_', ' ')}
        </p>
        <p className="text-xs leading-relaxed text-slate-200 font-sans">{trap.scenario}</p>
      </div>

      {hasContrastive && contrastiveOptions ? (
        /* Contrastive Falsification Challenge */
        <form onSubmit={handleContrastiveSubmit} className="space-y-3 pt-1">
          <p className="font-mono text-[11px] text-amber-200 font-semibold">
            1. Select the premise that contains the subtle mathematical or architectural flaw:
          </p>

          <div className="space-y-2">
            {contrastiveOptions.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;
              const letter = idx === 0 ? 'Claim A' : 'Claim B';
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setSelectedOptionId(opt.id)}
                  disabled={disabled}
                  className={`w-full text-left rounded-xl border p-3 text-xs transition cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400/15 text-white ring-1 ring-amber-400/40'
                      : 'border-white/15 bg-black/40 text-slate-300 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono font-bold text-amber-400 shrink-0 mt-0.5">
                      [{letter}]
                    </span>
                    <p className="leading-relaxed">{opt.text}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Citation Span Input */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 font-medium">
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span>2. Source Citation (sentence or equation from source reader that falsifies this claim):</span>
            </label>
            <input
              type="text"
              value={citationSpan}
              onChange={(e) => setCitationSpan(e.target.value)}
              disabled={disabled}
              placeholder="e.g. 'Dividing by sqrt(d_k) prevents softmax from saturating into regions with vanishing gradients...'"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Justification Textarea */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono text-slate-300 font-medium">
              3. Justification (Explain why the selected claim violates the system invariant):
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              disabled={disabled}
              rows={2}
              required
              placeholder="Explain the specific mathematical or systemic breakdown in 1-2 sentences."
              className="w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] font-mono text-slate-400">
              {submissionState === 'submitted'
                ? 'Evaluating falsification proof…'
                : 'Further graph progression is locked until resolved.'}
            </p>
            <button
              type="submit"
              disabled={disabled || !selectedOptionId || !justification.trim()}
              className="rounded-xl border border-amber-400/40 bg-amber-400/20 px-4 py-2 font-mono text-xs font-bold text-amber-200 hover:bg-amber-400/30 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submissionState === 'submitting' ? 'Verifying Proof…' : 'Submit Falsification Proof'}
            </button>
          </div>

          {feedback && (
            <p className="rounded-lg border border-amber-500/30 bg-black/40 p-2.5 text-xs text-amber-200 font-mono">
              {feedback}
            </p>
          )}
        </form>
      ) : (
        /* Open-ended Legacy Fallback */
        <form onSubmit={handleLegacySubmit} className="space-y-2 pt-1">
          <textarea
            id={fieldId}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="Explain exactly what happens and why — this input is required before the graph can proceed."
            className="w-full resize-none rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white/90 placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none disabled:opacity-60"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-white/40">
              {submissionState === 'submitted'
                ? 'Submitted — awaiting backend evaluation.'
                : 'The standard question input stays disabled until this is resolved.'}
            </p>
            <button
              type="submit"
              disabled={disabled || response.trim().length === 0}
              className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-1.5 font-mono text-xs font-medium text-amber-200 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submissionState === 'submitting' ? 'Submitting…' : 'Submit response'}
            </button>
          </div>
          {feedback && (
            <p className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/75 font-mono">
              {feedback}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
