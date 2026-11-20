import type { QuestionNode, TrapSubmissionState } from '../../lib/workspace-types';
import { Badge } from '../shared/Badge';
import { TrapPanel } from '../trap/TrapPanel';

export function NodeDetailPanel({
  node,
  onSelectFollowUp,
  trapSubmissionState,
  trapFeedback,
  onSubmitTrap,
}: {
  node: QuestionNode;
  onSelectFollowUp: (followUpId: string) => void;
  trapSubmissionState: TrapSubmissionState;
  trapFeedback?: string;
  onSubmitTrap: (response: string) => void;
}) {
  const trapBlocksProgress = node.isTrap && !node.trapResolvedAt;

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-fg/40">
          Question
          {node.researchMode && <Badge tone="accent">research mode</Badge>}
        </p>
        <p className="text-sm font-medium text-fg/90">{node.userQuestion}</p>
      </div>

      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wide text-fg/40">Explanation</p>
        <p className="text-sm leading-relaxed text-fg/75">{node.aiExplanation}</p>
      </div>

      {node.isTrap && node.trapMetadata && (
        <TrapPanel
          trap={node.trapMetadata}
          resolved={Boolean(node.trapResolvedAt)}
          submissionState={trapSubmissionState}
          feedback={trapFeedback}
          onSubmit={onSubmitTrap}
        />
      )}

      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-fg/40">
          Follow-ups {trapBlocksProgress && '(blocked by trap)'}
        </p>
        <div className="flex flex-wrap gap-2">
          {node.followUps.map((followUp) => (
            <button
              key={followUp.id}
              type="button"
              disabled={trapBlocksProgress}
              onClick={() => onSelectFollowUp(followUp.id)}
              className={[
                'rounded-sm border px-2.5 py-1.5 text-left text-xs leading-snug transition-colors',
                followUp.isSelected ? 'border-gold/40 bg-gold/10 text-gold' : 'border-line-strong text-fg/70 hover:border-line-strong',
                trapBlocksProgress ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              {followUp.questionText}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
