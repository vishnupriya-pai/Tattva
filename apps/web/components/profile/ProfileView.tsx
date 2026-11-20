'use client';

import { useState } from 'react';
import { Compass, Flame, GitBranch, Layers, Network, ShieldCheck, User } from 'lucide-react';
import { KnowledgeGraphCanvas } from '../knowledge-graph/KnowledgeGraphCanvas';
import {
  profileDomainSummaries,
  profileGraphNodes,
  profileResearchNodes,
  profileTotalNodes,
  profileTrapsSurvived,
} from '../../lib/fixtures/profile-graph-fixtures';

export interface ProfileViewProps {
  userId?: string;
  staminaBalance?: number;
  streakDays?: number;
}

interface Badge {
  id: string;
  label: string;
  detail: string;
  icon: typeof Layers;
  earned: boolean;
  accent: string;
}

/**
 * Minimal, static "lifetime" profile: a single connected Knowledge Graph
 * spanning every source/domain a learner has touched, laid out LeetCode-profile
 * style — a fixed stats/badges rail beside a full-height graph. Demo fixture
 * data; the graph itself reuses the same canvas/layout engine as the live
 * per-inquiry view.
 */
export function ProfileView({ userId = 'anonymous', staminaBalance = 0, streakDays = 0 }: ProfileViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const earnedAccent = 'text-gold border-gold-line bg-surface-1';
  const unearnedAccent = 'text-fg-muted border-line-strong bg-surface-1';

  const badges: Badge[] = [
    {
      id: 'polymath',
      label: 'Polymath',
      detail: `${profileDomainSummaries.length} domains explored`,
      icon: Layers,
      earned: true,
      accent: earnedAccent,
    },
    {
      id: 'trap-survivor',
      label: 'Trap Survivor',
      detail: `${profileTrapsSurvived} adversarial traps resolved`,
      icon: ShieldCheck,
      earned: profileTrapsSurvived > 0,
      accent: profileTrapsSurvived > 0 ? earnedAccent : unearnedAccent,
    },
    {
      id: 'research-initiate',
      label: 'Research Initiate',
      detail: `${profileResearchNodes} Research Mode inquiries`,
      icon: Compass,
      earned: profileResearchNodes > 0,
      accent: profileResearchNodes > 0 ? earnedAccent : unearnedAccent,
    },
    {
      id: 'deep-grapher',
      label: 'Deep Grapher',
      detail: `${profileTotalNodes} nodes in your graph`,
      icon: Network,
      earned: profileTotalNodes >= 10,
      accent: profileTotalNodes >= 10 ? earnedAccent : unearnedAccent,
    },
    {
      id: 'streak',
      label: 'On a Roll',
      detail: streakDays > 1 ? `${streakDays}-day streak` : 'Start a streak',
      icon: Flame,
      earned: streakDays > 1,
      accent: streakDays > 1 ? earnedAccent : unearnedAccent,
    },
  ];

  return (
    <div className="flex h-full overflow-hidden text-fg">
      {/* Left rail: identity, stats, badges — LeetCode-profile style */}
      <aside className="flex w-[320px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-bg px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface-2">
            <User className="h-6 w-6 text-fg-body" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">Learner Profile</p>
            <h1 className="text-lg font-semibold text-fg">{userId}</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface-1 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">Domains</p>
            <p className="font-mono text-xl font-bold text-fg">{profileDomainSummaries.length}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-1 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">Nodes</p>
            <p className="font-mono text-xl font-bold text-fg">{profileTotalNodes}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-1 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">Stamina</p>
            <p className="font-mono text-xl font-bold text-gold">{staminaBalance.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-1 p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">Streak</p>
            <p className="font-mono text-xl font-bold text-fg">{streakDays > 1 ? `${streakDays}d` : '—'}</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-fg-muted" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">Since day one</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {profileDomainSummaries.map((domain) => (
              <div
                key={domain.rootNodeId}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-2.5 py-1.5"
              >
                <span className="font-mono text-[11px] text-fg-body">{domain.label}</span>
                <span className="font-mono text-[10px] text-fg-muted">{domain.nodeCount} nodes</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">Badges</p>
          <div className="grid grid-cols-2 gap-2">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  title={badge.detail}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border p-2.5 transition ${
                    badge.earned ? badge.accent : 'border-line bg-surface-1 text-fg-faint opacity-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px] font-semibold leading-tight">{badge.label}</span>
                  <span className="text-[9px] leading-tight opacity-80">{badge.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Right: the single connected lifetime graph */}
      <div className="min-h-0 flex-1">
        <KnowledgeGraphCanvas
          nodes={profileGraphNodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          status="ready"
        />
      </div>
    </div>
  );
}
