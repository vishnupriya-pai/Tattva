'use client';

import { useState } from 'react';
import { GitBranch, User } from 'lucide-react';
import { KnowledgeGraphCanvas } from '../knowledge-graph/KnowledgeGraphCanvas';
import { profileDomainSummaries, profileGraphNodes } from '../../lib/fixtures/profile-graph-fixtures';

export interface ProfileViewProps {
  userId?: string;
  staminaBalance?: number;
  streakDays?: number;
}

/**
 * Minimal, static "lifetime" profile: one combined Knowledge Graph spanning
 * every source/domain a learner has touched, instead of per-inquiry
 * fragments. Demo fixture data — the layout and canvas are the same engine
 * used by the live per-inquiry graph.
 */
export function ProfileView({ userId = 'anonymous', staminaBalance = 0, streakDays = 0 }: ProfileViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const totalNodes = profileGraphNodes.length;

  return (
    <div className="flex h-full flex-col overflow-hidden text-slate-200">
      <div className="shrink-0 border-b border-white/10 bg-[#0b0d0f] px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[#181b22]">
              <User className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c59a67]">Learner Profile</p>
              <h1 className="text-lg font-semibold text-white">{userId}</h1>
            </div>
          </div>

          <div className="flex gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Domains Explored</p>
              <p className="font-mono text-xl font-bold text-white">{profileDomainSummaries.length}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Total Nodes</p>
              <p className="font-mono text-xl font-bold text-white">{totalNodes}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Stamina</p>
              <p className="font-mono text-xl font-bold text-white">{staminaBalance.toLocaleString()}</p>
            </div>
            {streakDays > 1 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Streak</p>
                <p className="font-mono text-xl font-bold text-[#c59a67]">{streakDays}d</p>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-[#c59a67]" />
          <span className="font-mono text-[11px] text-slate-500">Since day one, across every source:</span>
          {profileDomainSummaries.map((domain) => (
            <span
              key={domain.rootNodeId}
              className="rounded border border-white/10 bg-[#13161b] px-2 py-0.5 font-mono text-[10px] text-slate-300"
            >
              {domain.label} &middot; {domain.nodeCount} nodes
            </span>
          ))}
        </div>
      </div>

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
