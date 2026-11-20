'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  Sparkles,
  GitBranch,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Compass,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import type { QuestionNode } from '../../lib/workspace-types';
import type { NodeMetrics } from '../../lib/graph-metrics';

export type CircularConceptNodeData = {
  node: QuestionNode;
  isRoot: boolean;
  metrics: NodeMetrics;
  onOpenDetails?: (nodeId: string) => void;
};

export type CircularConceptNodeType = Node<CircularConceptNodeData, 'conceptNode'>;

export function CircularConceptNode({ data, selected }: NodeProps<CircularConceptNodeType>) {
  const { node, isRoot, metrics } = data;
  const isUnresolvedTrap = node.isTrap && !node.trapResolvedAt;
  const isTrapResolved = node.isTrap && Boolean(node.trapResolvedAt);
  const isConquered = node.masteryStatus === 'conquered' || isTrapResolved;
  const isChallenged = node.masteryStatus === 'challenged' || isUnresolvedTrap;
  const isLocked = Boolean(node.isPrerequisiteLocked);

  // Dynamic Socratic styling: Conquered (Solid Gold), Challenged (Pulsing Amber), Tentative (Dashed Slate), Locked (Dimmed)
  let circleStyles = '';
  let glowStyles = '';
  let iconColor = '';
  let tagColor = '';
  let statusBadge = '';

  if (isLocked) {
    circleStyles = 'border-slate-700/80 bg-[#0e1014]/90 text-slate-500 opacity-60';
    glowStyles = 'hover:border-slate-500 shadow-none';
    iconColor = 'text-slate-500';
    tagColor = 'text-slate-500 border-slate-700/60 bg-slate-900/60';
    statusBadge = 'LOCKED';
  } else if (isChallenged) {
    circleStyles = 'border-amber-400/70 bg-[#1e1710]/90 text-amber-200';
    glowStyles = 'ring-2 ring-amber-400/20 shadow-[0_0_18px_rgba(217,119,6,0.3)] animate-pulse';
    iconColor = 'text-amber-300';
    tagColor = 'text-amber-200/90 border-amber-400/30 bg-amber-950/40';
    statusBadge = 'TRAP';
  } else if (isConquered) {
    // Verified Mastery: Burnished Champagne Bronze
    circleStyles = 'border-[#c59a67]/90 bg-gradient-to-br from-[#1f1a14] to-[#120f0c] text-[#c59a67]';
    glowStyles = 'ring-2 ring-[#c59a67]/25 shadow-[0_0_18px_rgba(197,154,103,0.35)]';
    iconColor = 'text-[#c59a67]';
    tagColor = 'text-[#c59a67] border-[#c59a67]/40 bg-[#c59a67]/10';
    statusBadge = 'VERIFIED';
  } else if (metrics.tier === 'deep') {
    circleStyles = 'border-emerald-400 bg-emerald-950/90 text-emerald-100';
    glowStyles = 'ring-4 ring-emerald-500/25 shadow-[0_0_25px_rgba(16,185,129,0.45)]';
    iconColor = 'text-emerald-400';
    tagColor = 'text-emerald-300 border-emerald-500/30 bg-emerald-950/40';
    statusBadge = 'DEEP';
  } else {
    // Tentative / Probed: Dashed border
    circleStyles = 'border-dashed border-2 border-slate-500/70 bg-[#12141a]/90 text-slate-300';
    glowStyles = 'hover:border-slate-300 shadow-[0_0_12px_rgba(255,255,255,0.06)]';
    iconColor = 'text-slate-400';
    tagColor = 'text-slate-400 border-white/15 bg-white/5';
    statusBadge = 'PROBED';
  }

  return (
    <div
      onClick={() => data.onOpenDetails?.(node.id)}
      className="group relative flex flex-col items-center cursor-pointer"
    >
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2.5 !w-2.5 !border-2 !border-[#0b0b0d] !bg-white/40"
        />
      )}

      {/* Circular Node Bubble */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onOpenDetails?.(node.id);
        }}
        title="Tap to view full explanation, hypothesis & follow-up branches"
        className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300 ${circleStyles} ${glowStyles} ${
          selected ? 'scale-110 !border-white ring-4 !ring-white/40' : 'hover:scale-105'
        }`}
      >
        {isLocked ? (
          <Lock className="h-5 w-5 text-slate-500" />
        ) : isChallenged ? (
          <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
        ) : isConquered ? (
          <CheckCircle2 className="h-6 w-6 text-[#c59a67]" />
        ) : isRoot ? (
          <Sparkles className={`h-6 w-6 ${iconColor}`} />
        ) : metrics.tier === 'deep' ? (
          <Flame className={`h-6 w-6 ${iconColor}`} />
        ) : node.researchMode ? (
          <Compass className="h-6 w-6 text-amber-400" />
        ) : (
          <GitBranch className={`h-5 w-5 ${iconColor}`} />
        )}

        {/* Small status pill floating on top-left of the bubble */}
        <span
          className={`absolute -top-1.5 -left-1 flex h-4 items-center justify-center rounded-full px-1.5 font-mono text-[8px] font-bold tracking-wider shadow-sm uppercase ${
            isLocked
              ? 'bg-slate-800 text-slate-400 border border-slate-700'
              : isConquered
              ? 'bg-[#c59a67] text-black border border-white/20'
              : isChallenged
              ? 'bg-amber-500 text-black border border-black/30'
              : 'bg-slate-700 text-slate-300 border border-white/10'
          }`}
        >
          {statusBadge}
        </span>

        {/* Child Count Badge on top-right */}
        {metrics.childCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 font-mono text-[9px] font-bold text-black shadow-sm">
            {metrics.childCount}
          </span>
        )}
      </button>

      {/* Conceptual Tag Underneath */}
      <div className="mt-2 flex flex-col items-center max-w-[140px] text-center pointer-events-none">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase truncate max-w-full shadow-sm backdrop-blur-sm ${tagColor}`}
        >
          {metrics.conceptTag}
        </span>
        <span className="mt-0.5 text-[11px] font-medium leading-tight text-white/75 line-clamp-1 drop-shadow-md">
          {node.userQuestion}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-[#0b0b0d] !bg-white/40"
      />
    </div>
  );
}
