'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  Sparkles,
  GitBranch,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Compass,
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

  // Dynamic color styling based on discussion depth & relevance
  const tier = metrics.tier;

  let circleStyles = '';
  let glowStyles = '';
  let iconColor = '';
  let tagColor = '';

  if (isUnresolvedTrap) {
    circleStyles = 'border-rose-500 bg-rose-950/80 text-rose-200';
    glowStyles = 'ring-4 ring-rose-500/30 shadow-[0_0_24px_rgba(244,63,94,0.45)] animate-pulse';
    iconColor = 'text-rose-400';
    tagColor = 'text-rose-400 border-rose-500/30 bg-rose-950/40';
  } else if (tier === 'deep') {
    // Deep green glow for heavily discussed / branched topics
    circleStyles = 'border-emerald-400 bg-emerald-950/90 text-emerald-100';
    glowStyles = 'ring-4 ring-emerald-500/25 shadow-[0_0_25px_rgba(16,185,129,0.45)]';
    iconColor = 'text-emerald-400';
    tagColor = 'text-emerald-300 border-emerald-500/30 bg-emerald-950/40';
  } else if (tier === 'moderate') {
    // Yellow/amber glow for moderately discussed topics
    circleStyles = 'border-amber-400 bg-amber-950/80 text-amber-100';
    glowStyles = 'ring-3 ring-amber-500/25 shadow-[0_0_18px_rgba(245,158,11,0.35)]';
    iconColor = 'text-amber-400';
    tagColor = 'text-amber-300 border-amber-500/30 bg-amber-950/40';
  } else if (tier === 'divergent') {
    // Reddish tint for divergent/off-topic discussions
    circleStyles = 'border-red-500/80 bg-red-950/60 text-red-200';
    glowStyles = 'ring-3 ring-red-500/20 shadow-[0_0_18px_rgba(239,68,68,0.3)]';
    iconColor = 'text-red-400';
    tagColor = 'text-red-300 border-red-500/30 bg-red-950/40';
  } else {
    // Initial BnW (Black and White / neutral zinc) state
    circleStyles = 'border-zinc-500/60 bg-zinc-900/90 text-zinc-300';
    glowStyles = 'hover:border-zinc-300 shadow-[0_0_10px_rgba(255,255,255,0.08)]';
    iconColor = 'text-zinc-400';
    tagColor = 'text-zinc-400 border-zinc-700/60 bg-zinc-900/60';
  }

  return (
    <div className="group relative flex flex-col items-center">
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
        title="Tap to view full explanation & follow-up branches"
        className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300 ${circleStyles} ${glowStyles} ${
          selected ? 'scale-110 !border-white ring-4 !ring-white/40' : 'hover:scale-105'
        }`}
      >
        {isUnresolvedTrap ? (
          <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
        ) : isTrapResolved ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        ) : isRoot ? (
          <Sparkles className={`h-6 w-6 ${iconColor}`} />
        ) : tier === 'deep' ? (
          <Flame className={`h-6 w-6 ${iconColor}`} />
        ) : node.researchMode ? (
          <Compass className={`h-6 w-6 text-amber-400`} />
        ) : (
          <GitBranch className={`h-5 w-5 ${iconColor}`} />
        )}

        {/* Small badge count if multiple children have branched off this node */}
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
