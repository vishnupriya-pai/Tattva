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
    circleStyles = 'border-trap bg-trap-wash text-trap';
    glowStyles = 'ring-4 ring-trap/30';
    iconColor = 'text-trap';
    tagColor = 'text-trap border-trap/30 bg-trap-wash';
  } else if (tier === 'deep') {
    circleStyles = 'border-explored bg-explored/90 text-explored';
    glowStyles = 'ring-4 ring-explored/25';
    iconColor = 'text-explored';
    tagColor = 'text-explored border-explored/30 bg-explored/40';
  } else if (tier === 'moderate') {
    circleStyles = 'border-fg-muted/60 bg-surface-2 text-fg-muted';
    glowStyles = 'ring-3 ring-fg-muted/20';
    iconColor = 'text-fg-muted';
    tagColor = 'text-fg-muted border-fg-muted/20 bg-surface-2/60';
  } else if (tier === 'divergent') {
    circleStyles = 'border-trap/80 bg-trap/60 text-trap';
    glowStyles = 'ring-3 ring-trap/20';
    iconColor = 'text-trap';
    tagColor = 'text-trap border-trap/30 bg-trap/40';
  } else {
    circleStyles = 'border-line-strong/60 bg-surface-1/90 text-fg-muted';
    glowStyles = 'hover:border-line-strong';
    iconColor = 'text-fg-muted';
    tagColor = 'text-fg-muted border-line-strong/60 bg-surface-1/60';
  }

  return (
    <div className="group relative flex flex-col items-center">
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2.5 !w-2.5 !border-2 !border-bg !bg-surface-2/40"
        />
      )}

      {/* Circular Node Bubble */}
      <button
        type="button"
        title="Tap to view full explanation & follow-up branches"
        className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300 ${circleStyles} ${glowStyles} ${
          selected ? 'scale-110 !border-line ring-4 !ring-line-strong' : 'hover:scale-105'
        }`}
      >
        {isUnresolvedTrap ? (
          <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
        ) : isTrapResolved ? (
          <CheckCircle2 className="h-6 w-6 text-explored" />
        ) : isRoot ? (
          <Sparkles className={`h-6 w-6 ${iconColor}`} />
        ) : tier === 'deep' ? (
          <Flame className={`h-6 w-6 ${iconColor}`} />
        ) : node.researchMode ? (
          <Compass className={`h-6 w-6 text-gold`} />
        ) : (
          <GitBranch className={`h-5 w-5 ${iconColor}`} />
        )}

        {/* Small badge count if multiple children have branched off this node */}
        {metrics.childCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-surface-2 px-1 font-mono text-xs font-bold text-fg shadow-sm">
            {metrics.childCount}
          </span>
        )}
      </button>

      {/* Conceptual Tag Underneath */}
      <div className="mt-2 flex flex-col items-center max-w-[140px] text-center pointer-events-none">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold truncate max-w-full shadow-sm backdrop-blur-sm ${tagColor}`}
        >
          {metrics.conceptTag}
        </span>
        <span className="mt-0.5 text-xs font-medium leading-tight text-fg/75 line-clamp-1 drop-shadow-md">
          {node.userQuestion}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-bg !bg-surface-2/40"
      />
    </div>
  );
}
