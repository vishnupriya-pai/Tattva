import type { QuestionNode, TrapSubmissionState } from '../../lib/workspace-types';
import { Badge } from '../shared/Badge';
import { TrapPanel } from '../trap/TrapPanel';
import { RichText } from '../shared/RichText';

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
    <div className="space-y-5">
      <div>
        <p className="mb-1 flex items-center gap-2 text-xs text-fg-muted">
          Question
          {node.researchMode && <Badge tone="accent">research mode</Badge>}
        </p>
        <p className="text-base font-semibold leading-snug text-fg">{node.userQuestion}</p>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-fg-muted">Answer</p>
        <RichText text={node.aiExplanation} className="text-[15px] leading-7 text-fg-body" />
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
        <p className="mb-2 text-xs text-fg-muted">
          Go deeper {trapBlocksProgress && '(answer the check above first)'}
        </p>
        <ol className="space-y-2">
          {node.followUps.map((followUp, index) => (
            <li key={followUp.id}>
              <button
                type="button"
                disabled={trapBlocksProgress}
                onClick={() => onSelectFollowUp(followUp.id)}
                className={[
                  'flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm leading-6 transition-colors',
                  followUp.isSelected
                    ? 'border-explored/40 bg-explored/10 text-explored'
                    : 'border-line text-fg-body hover:border-line-strong hover:bg-surface-2 cursor-pointer',
                  trapBlocksProgress ? 'cursor-not-allowed opacity-40' : '',
                ].join(' ')}
              >
                <span className="mt-px font-mono text-xs text-fg-muted">{index + 1}</span>
                <RichText inline text={followUp.questionText} />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
