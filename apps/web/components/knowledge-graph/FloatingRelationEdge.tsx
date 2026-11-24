'use client';

import { BaseEdge, EdgeLabelRenderer, useInternalNode, type Edge, type EdgeProps } from '@xyflow/react';
import { CONCEPT_NODE_WIDTH, type ConceptBubbleData } from './ConceptBubbleNode';

export type RelationEdgeData = {
  label: string;
  predicted: boolean;
  /** Show the relation label (edges touching the focused concept). */
  showLabel: boolean;
  dimmed: boolean;
  opacity: number;
};

export type RelationEdgeType = Edge<RelationEdgeData, 'relation'>;

/** Bubble centre in flow coordinates (bubble sits centred at the top of the node box). */
function centreOf(node: ReturnType<typeof useInternalNode>) {
  if (!node) return null;
  const radius = (node.data as ConceptBubbleData).radius;
  return {
    x: node.internals.positionAbsolute.x + CONCEPT_NODE_WIDTH / 2,
    y: node.internals.positionAbsolute.y + radius,
    r: radius,
  };
}

/** Straight edge from bubble border to bubble border, so arrows stay visible. */
export function FloatingRelationEdge({ id, source, target, markerEnd, data }: EdgeProps<RelationEdgeType>) {
  const a = centreOf(useInternalNode(source));
  const b = centreOf(useInternalNode(target));
  if (!a || !b || !data) return null;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const gap = 5;
  const x1 = a.x + (dx / d) * (a.r + gap);
  const y1 = a.y + (dy / d) * (a.r + gap);
  const x2 = b.x - (dx / d) * (b.r + gap);
  const y2 = b.y - (dy / d) * (b.r + gap);
  const opacity = data.dimmed ? 0.08 : data.opacity;

  return (
    <>
      <BaseEdge
        id={id}
        path={`M ${x1},${y1} L ${x2},${y2}`}
        markerEnd={markerEnd}
        style={{
          stroke: data.showLabel ? 'var(--color-gold)' : 'var(--color-fg-muted)',
          strokeWidth: data.showLabel ? 2 : 1.25,
          strokeDasharray: data.predicted ? '5 4' : undefined,
          opacity,
          transition: 'opacity 200ms',
        }}
      />
      {data.showLabel && (
        <EdgeLabelRenderer>
          <span
            className="nodrag nopan pointer-events-none absolute rounded-md border border-gold-line bg-surface-1 px-1.5 py-0.5 font-mono text-[11px] text-fg"
            style={{ transform: `translate(-50%, -50%) translate(${(x1 + x2) / 2}px, ${(y1 + y2) / 2}px)` }}
          >
            {data.label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
