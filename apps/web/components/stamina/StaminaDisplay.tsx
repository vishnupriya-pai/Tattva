import type { StaminaState } from '../../lib/workspace-types';
import { Badge } from '../shared/Badge';

const EVENT_LABEL: Record<string, string> = {
  inquiry_started: 'Inquiry started',
  followup_selected: 'Branch explored',
  trap_survived: 'Trap survived',
  node_completed_research_mode: 'Research mode node',
};

export function StaminaDisplay({
  stamina,
  researchMode,
}: {
  stamina: StaminaState;
  researchMode: boolean;
}) {
  const latest = stamina.recentTransactions[0];

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-none">
        <p className="text-xs text-fg/40">Stamina</p>
        <p className="font-mono text-base font-semibold text-fg">{stamina.balance}</p>
      </div>
      {stamina.streakDays > 1 && (
        <span className="text-xs text-fg/40">{stamina.streakDays}-day streak</span>
      )}
      {researchMode && <Badge tone="accent">3× pending scoring</Badge>}
      {latest && (
        <span className="hidden text-xs text-fg/40 sm:inline" title={EVENT_LABEL[latest.eventType]}>
          +{latest.finalPoints} &middot; {EVENT_LABEL[latest.eventType] ?? latest.eventType}
        </span>
      )}
    </div>
  );
}
