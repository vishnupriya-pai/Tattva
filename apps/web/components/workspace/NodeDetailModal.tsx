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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative flex flex-col w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-line-strong bg-surface-1 text-fg shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-2/[0.02]">
          <div className="flex flex-wrap items-center gap-2">
            {isRoot ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 border border-fg/40 px-2.5 py-0.5 text-xs font-semibold text-fg">
                <Sparkles className="h-3.5 w-3.5" />
                Root Concept
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 border border-line-strong px-2.5 py-0.5 text-xs font-medium text-fg-muted">
                <GitBranch className="h-3.5 w-3.5" />
                Depth {metrics?.depth ?? 1}
              </span>
            )}

            {node.researchMode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-xs font-semibold text-gold">
                Research Mode
              </span>
            )}

            {metrics?.tier === 'deep' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-explored/20 border border-explored/40 px-2.5 py-0.5 text-xs font-semibold text-explored">
                <Flame className="h-3.5 w-3.5" />
                Deep Discussion
              </span>
            )}

            {isUnresolvedTrap && (
              <span className="inline-flex items-center gap-1 rounded-full bg-trap-wash border border-trap/40 px-2.5 py-0.5 text-xs font-semibold text-trap animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                Active Trap
              </span>
            )}

            {node.isTrap && node.trapResolvedAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-explored/20 border border-explored/40 px-2.5 py-0.5 text-xs font-semibold text-explored">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Trap Survived
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg/50 hover:bg-surface-2/10 hover:text-fg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Main Question */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gold/90 mb-1">
              Inquiry Question
            </p>
            <h3 className="text-lg font-semibold leading-snug text-fg">
              {node.userQuestion}
            </h3>
          </div>

          {/* AI Explanation Box */}
          <div className="rounded-xl border border-line bg-surface-2/[0.03] p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-fg/50">
              <BookOpen className="h-4 w-4 text-gold/80" />
              <span>Technical Synthesis & Trade-offs</span>
            </div>
            <p className="text-sm leading-relaxed text-fg/80 whitespace-pre-line">
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
              <span className="text-xs font-semibold uppercase tracking-wider text-fg/50">
                Explore Contextual Follow-Ups
              </span>
              <span className="text-xs text-fg/40">
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
                        ? 'border-explored/30 bg-explored/20 text-explored hover:bg-explored/30'
                        : 'border-line bg-surface-2/[0.02] text-fg/80 hover:border-gold/50 hover:bg-surface-2/[0.05] hover:text-fg'
                    } ${isUnresolvedTrap ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                        isBranched
                          ? 'bg-explored text-gold-ink'
                          : 'bg-surface-2/10 text-fg/70'
                      }`}
                    >
                      {isBranched ? <CheckCircle2 className="h-3.5 w-3.5" /> : `0${idx + 1}`}
                    </span>
                    <span className="flex-1 text-xs font-medium leading-relaxed">
                      {followUp.questionText}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-fg/30 group-hover:text-fg" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer: Ask Custom Branch Question */}
        <div className="border-t border-line p-4 bg-surface-2/[0.02]">
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
                className="w-full rounded-xl border border-line-strong bg-surface-2/5 px-4 py-2.5 text-xs text-fg placeholder:text-fg/35 focus:border-gold/60 focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isUnresolvedTrap || isAskingCustom || !customInput.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs font-medium text-gold hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40 transition"
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
