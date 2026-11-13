'use client';

import React from 'react';
import {
  X,
  Sparkles,
  GitBranch,
  AlertTriangle,
  Flame,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Send,
} from 'lucide-react';
import type { QuestionNode, TrapSubmissionState } from '../../lib/workspace-types';
import type { NodeMetrics } from '../../lib/graph-metrics';
import { TrapPanel } from '../trap/TrapPanel';

interface NodeDetailModalProps {
  node: QuestionNode;
  metrics?: NodeMetrics;
  onClose: () => void;
  onSelectFollowUp: (followUpId: string) => void;
  trapSubmissionState: TrapSubmissionState;
  trapFeedback?: string;
  onSubmitTrap: (response: string) => void;
  onAskCustomQuestion: (question: string) => void;
  isAskingCustom?: boolean;
}

export function NodeDetailModal({
  node,
  metrics,
  onClose,
  onSelectFollowUp,
  trapSubmissionState,
  trapFeedback,
  onSubmitTrap,
  onAskCustomQuestion,
  isAskingCustom,
}: NodeDetailModalProps) {
  const [customInput, setCustomInput] = React.useState('');
  const isUnresolvedTrap = node.isTrap && !node.trapResolvedAt;
  const isRoot = node.parentNodeId === null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || isUnresolvedTrap || isAskingCustom) return;
    onAskCustomQuestion(customInput.trim());
    setCustomInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-white/15 bg-[#141417] text-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-2">
            {isRoot ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/30 border border-indigo-400/40 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                Root Concept
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
                <GitBranch className="h-3.5 w-3.5" />
                Depth {metrics?.depth ?? 1}
              </span>
            )}

            {node.researchMode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                Research Mode
              </span>
            )}

            {metrics?.tier === 'deep' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                <Flame className="h-3.5 w-3.5" />
                Deep Discussion
              </span>
            )}

            {isUnresolvedTrap && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/40 px-2.5 py-0.5 text-xs font-semibold text-rose-300 animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                Active Trap
              </span>
            )}

            {node.isTrap && node.trapResolvedAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Trap Survived
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Main Question */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 mb-1">
              Inquiry Question
            </p>
            <h3 className="text-lg font-semibold leading-snug text-white">
              {node.userQuestion}
            </h3>
          </div>

          {/* AI Explanation Box */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-white/50">
              <BookOpen className="h-4 w-4 text-amber-400/80" />
              <span>Technical Synthesis & Trade-offs</span>
            </div>
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">
              {node.aiExplanation}
            </p>
          </div>

          {/* Adversarial Trap Section if present */}
          {node.isTrap && node.trapMetadata && (
            <TrapPanel
              trap={node.trapMetadata}
              resolved={Boolean(node.trapResolvedAt)}
              submissionState={trapSubmissionState}
              feedback={trapFeedback}
              onSubmit={onSubmitTrap}
            />
          )}

          {/* Pre-generated Follow-up Questions */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Explore Contextual Follow-Ups
              </span>
              <span className="text-xs text-white/40">
                {node.followUps.filter((f) => f.isSelected || f.childNodeId).length}/3 branched
              </span>
            </div>

            <div className="space-y-2">
              {node.followUps.map((followUp, idx) => {
                const isBranched = Boolean(followUp.isSelected || followUp.childNodeId);
                return (
                  <button
                    key={followUp.id}
                    type="button"
                    disabled={isUnresolvedTrap}
                    onClick={() => onSelectFollowUp(followUp.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      isBranched
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-950/30'
                        : 'border-white/10 bg-white/[0.02] text-white/80 hover:border-amber-400/50 hover:bg-white/[0.05] hover:text-white'
                    } ${isUnresolvedTrap ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                        isBranched
                          ? 'bg-emerald-500 text-black'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {isBranched ? <CheckCircle2 className="h-3.5 w-3.5" /> : `0${idx + 1}`}
                    </span>
                    <span className="flex-1 text-xs font-medium leading-relaxed">
                      {followUp.questionText}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-white/30 group-hover:text-white" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer: Ask Custom Branch Question */}
        <div className="border-t border-white/10 p-4 bg-white/[0.02]">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                disabled={isUnresolvedTrap || isAskingCustom}
                placeholder={
                  isUnresolvedTrap
                    ? 'Resolve the trap above to branch further...'
                    : 'Ask your own question to branch from this node...'
                }
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs text-white placeholder:text-white/35 focus:border-amber-400/60 focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isUnresolvedTrap || isAskingCustom || !customInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-xs font-medium text-amber-200 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40 transition"
            >
              {isAskingCustom ? (
                <span>Thinking…</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Branch</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
