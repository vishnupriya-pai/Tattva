'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Star } from 'lucide-react';
import type { MasteryStatus } from '@tattva/graph-analytics';

export type ConceptBubbleData = {
  name: string;
  radius: number;
  status: MasteryStatus;
  /** Community ring colour. */
  ring: string;
  isKeystone: boolean;
  mentionCount: number;
  /** Something else is focused and this concept is not related to it. */
  dimmed: boolean;
};

export type ConceptBubbleNodeType = Node<ConceptBubbleData, 'conceptBubble'>;

/** Width of the node box; the bubble is centred at the top and the label sits under it. */
export const CONCEPT_NODE_WIDTH = 132;

const FILL: Record<MasteryStatus, string> = {
  untouched: 'bg-surface-1 border-line-strong',
  touched: 'bg-surface-2 border-fg-muted/50',
  explored: 'bg-explored/35 border-explored/70',
  mastered: 'bg-explored border-explored',
  misconception: 'bg-trap-wash border-trap',
};

/**
 * Invisible handles in React Flow's default spots. FloatingRelationEdge ignores
 * handle positions and draws border to border; React Flow only needs them to
 * exist. (Re-positioning or shrinking them to 0 froze React Flow 12's handle
 * measurement, so keep them stock.)
 */
const HANDLE = '!pointer-events-none !opacity-0';

export function ConceptBubbleNode({ data, selected }: NodeProps<ConceptBubbleNodeType>) {
  const size = data.radius * 2;
  return (
    <div
      className={`relative flex flex-col items-center transition-opacity duration-200 ${data.dimmed ? 'opacity-25' : 'opacity-100'}`}
      style={{ width: CONCEPT_NODE_WIDTH }}
    >
      <div
        className={`relative rounded-full border-2 transition-transform duration-200 ${FILL[data.status]} ${
          selected ? 'scale-110' : 'hover:scale-105'
        }`}
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 0 ${selected ? 5 : 3}px ${data.ring}`,
        }}
      >
        {data.isKeystone && (
          <span
            title="Keystone: links otherwise separate parts of your map"
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-gold-ink"
          >
            <Star className="h-2.5 w-2.5" fill="currentColor" />
          </span>
        )}
      </div>
      <Handle type="target" position={Position.Top} className={HANDLE} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} className={HANDLE} isConnectable={false} />
      <span
        className={`mt-1.5 max-w-full text-center text-xs font-medium leading-tight line-clamp-2 ${
          data.status === 'misconception' ? 'text-trap' : 'text-fg'
        }`}
      >
        {data.name}
      </span>
    </div>
  );
}
