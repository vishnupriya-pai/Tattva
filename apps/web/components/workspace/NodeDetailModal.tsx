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
  Code2,
} from 'lucide-react';
import type { QuestionNode, TrapSubmissionState } from '../../lib/workspace-types';
import type { NodeMetrics } from '../../lib/graph-metrics';
import { TrapPanel } from '../trap/TrapPanel';
import { CodeChallengePanel } from '../sandbox/CodeChallengePanel';

type ModalTab = 'synthesis' | 'trap' | 'code' | 'followups';

interface NodeDetailModalProps {
  node: QuestionNode;
  metrics?: NodeMetrics;
  onClose: () => void;
  onSelectFollowUp: (followUpId: string) => void;
  trapSubmissionState: TrapSubmissionState;
  trapFeedback?: string;
  onSubmitTrap: (submission: string | { selectedOptionId: string; citationSpan: string; justification: string }) => void;
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
  const hasTrap = Boolean(node.isTrap && node.trapMetadata);

  const [activeTab, setActiveTab] = React.useState<ModalTab>(() =>
    isUnresolvedTrap ? 'trap' : 'synthesis'
  );

  React.useEffect(() => {
    if (isUnresolvedTrap) {
      setActiveTab('trap');
    }
  }, [node.id, isUnresolvedTrap]);

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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Main Question */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 mb-1">
              Inquiry Question
            </p>
            <h3 className="text-lg font-semibold leading-snug text-white">
              {node.userQuestion}
            </h3>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0e1014] p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('synthesis')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
                activeTab === 'synthesis'
                  ? 'bg-white/10 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#c59a67]" />
              <span>Synthesis</span>
            </button>

            {hasTrap && (
              <button
                type="button"
                onClick={() => setActiveTab('trap')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer relative ${
                  activeTab === 'trap'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold'
                    : 'text-amber-400/80 hover:text-amber-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Adversarial Trap</span>
                {isUnresolvedTrap && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-white/10 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Code Sandbox</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('followups')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
                activeTab === 'followups'
                  ? 'bg-white/10 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span>Follow-Ups</span>
              <span className="rounded-full bg-white/10 px-1.5 text-[10px]">
                {node.followUps.length}
              </span>
            </button>
          </div>

          {/* Tab 1: Synthesis & Learner Hypothesis */}
          {activeTab === 'synthesis' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {node.learnerHypothesis && (
                <div className="rounded-xl border border-[#c59a67]/30 bg-[#c59a67]/5 p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#c59a67] uppercase tracking-wider">
                    <span>Learner Hypothesis (Your Intuition)</span>
                    {node.timeToFormulationMs && (
                      <span className="text-slate-400 font-mono text-[10px]">
                        {Math.round(node.timeToFormulationMs / 1000)}s formulation time
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 italic leading-relaxed">
                    &ldquo;{node.learnerHypothesis}&rdquo;
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-white/50">
                  <BookOpen className="h-4 w-4 text-amber-400/80" />
                  <span>Technical Synthesis & Trade-offs</span>
                </div>
                <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">
                  {node.aiExplanation}
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Adversarial Trap Section */}
          {activeTab === 'trap' && hasTrap && node.trapMetadata && (
            <div className="animate-in fade-in duration-150">
              <TrapPanel
                trap={node.trapMetadata}
                resolved={Boolean(node.trapResolvedAt)}
                submissionState={trapSubmissionState}
                feedback={trapFeedback}
                contrastiveOptions={node.contrastiveOptions}
                onSubmit={onSubmitTrap}
              />
            </div>
          )}

          {/* Tab 3: Executable Code Sandbox */}
          {activeTab === 'code' && (
            <div className="animate-in fade-in duration-150">
              <CodeChallengePanel node={node} />
            </div>
          )}

          {/* Tab 4: Pre-generated Follow-up Questions */}
          {activeTab === 'followups' && (
            <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Explore Contextual Follow-Ups {isUnresolvedTrap && '(Blocked by active trap)'}
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
                      } ${isUnresolvedTrap ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
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
          )}
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
