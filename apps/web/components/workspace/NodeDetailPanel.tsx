import { useState, useEffect } from 'react';
import type { QuestionNode, TrapSubmissionState } from '../../lib/workspace-types';
import { Badge } from '../shared/Badge';
import { TrapPanel } from '../trap/TrapPanel';
import { CodeChallengePanel } from '../sandbox/CodeChallengePanel';
import { BookOpen, AlertTriangle, Code2, GitBranch, CheckCircle2, Maximize2 } from 'lucide-react';

type PanelTab = 'synthesis' | 'trap' | 'code' | 'followups';

export function NodeDetailPanel({
  node,
  onSelectFollowUp,
  trapSubmissionState,
  trapFeedback,
  onSubmitTrap,
  onOpenModal,
}: {
  node: QuestionNode;
  onSelectFollowUp: (followUpId: string) => void;
  trapSubmissionState: TrapSubmissionState;
  trapFeedback?: string;
  onSubmitTrap: (submission: string | { selectedOptionId: string; citationSpan: string; justification: string }) => void;
  onOpenModal?: () => void;
}) {
  const trapBlocksProgress = node.isTrap && !node.trapResolvedAt;
  const hasTrap = Boolean(node.isTrap && node.trapMetadata);

  const [activeTab, setActiveTab] = useState<PanelTab>(() =>
    trapBlocksProgress ? 'trap' : 'synthesis'
  );

  // Auto-switch to trap tab if node is an unresolved trap
  useEffect(() => {
    if (trapBlocksProgress) {
      setActiveTab('trap');
    }
  }, [node.id, trapBlocksProgress]);

  return (
    <div className="space-y-3">
      {/* Node Header */}
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-white/50">
          <span className="font-mono text-slate-400">Concept Node</span>
          {node.researchMode && <Badge tone="accent">research mode</Badge>}
          {node.masteryStatus === 'conquered' && (
            <span className="rounded bg-[#c59a67]/20 border border-[#c59a67]/40 px-2 py-0.5 text-[9px] font-mono text-[#c59a67] font-bold uppercase">
              Verified Mastery
            </span>
          )}
          {node.masteryStatus === 'challenged' && (
            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-mono text-amber-300 font-bold uppercase animate-pulse">
              Trap Active
            </span>
          )}
          {node.masteryStatus === 'tentative' && (
            <span className="rounded bg-slate-800 border border-white/20 px-2 py-0.5 text-[9px] font-mono text-slate-400 font-bold uppercase">
              Probed
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-white/95 leading-snug">{node.userQuestion}</h3>
          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              title="Expand into focused modal"
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Tabs Navigation */}
      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#12141a] p-1 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('synthesis')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer ${
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
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer relative ${
              activeTab === 'trap'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Adversarial Trap</span>
            {trapBlocksProgress && (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer ${
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
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer ${
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

      {/* Tab Panels */}
      {activeTab === 'synthesis' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {node.learnerHypothesis && (
            <div className="rounded-lg border border-[#c59a67]/30 bg-[#c59a67]/5 p-3 space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#c59a67] font-semibold">
                <span>Learner Hypothesis (Your Intuition)</span>
                {node.timeToFormulationMs && (
                  <span className="text-slate-400 font-mono text-[9px]">
                    {Math.round(node.timeToFormulationMs / 1000)}s formulation time
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 italic font-sans leading-relaxed">
                &ldquo;{node.learnerHypothesis}&rdquo;
              </p>
            </div>
          )}

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-white/40">Explanation & First Principles</p>
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">{node.aiExplanation}</p>
          </div>
        </div>
      )}

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

      {activeTab === 'code' && (
        <div className="animate-in fade-in duration-150">
          <CodeChallengePanel node={node} />
        </div>
      )}

      {activeTab === 'followups' && (
        <div className="space-y-2 animate-in fade-in duration-150">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-white/40">
            Branching Follow-up Inquiries {trapBlocksProgress && '(Resolve trap above to branch)'}
          </p>
          <div className="flex flex-col gap-2">
            {node.followUps.map((followUp, idx) => {
              const isSelected = Boolean(followUp.isSelected || followUp.childNodeId);
              return (
                <button
                  key={followUp.id}
                  type="button"
                  disabled={trapBlocksProgress}
                  onClick={() => onSelectFollowUp(followUp.id)}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs leading-relaxed transition ${
                    isSelected
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                      : 'border-white/10 bg-white/[0.02] text-white/80 hover:border-[#c59a67]/50 hover:bg-white/5 hover:text-white'
                  } ${trapBlocksProgress ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                >
                  <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded font-mono text-[9px] font-bold bg-white/10 text-white/70">
                    {isSelected ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : `0${idx + 1}`}
                  </span>
                  <span className="flex-1">{followUp.questionText}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
