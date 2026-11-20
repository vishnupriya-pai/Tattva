import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { QuestionNode } from '../../lib/workspace-types';
import { Badge } from '../shared/Badge';

export type QuestionGraphNodeData = { node: QuestionNode; isRoot: boolean };
export type QuestionGraphNodeType = Node<QuestionGraphNodeData, 'questionNode'>;

export function QuestionGraphNode({ data, selected }: NodeProps<QuestionGraphNodeType>) {
  const { node, isRoot } = data;
  const isUnresolvedTrap = node.isTrap && !node.trapResolvedAt;

  return (
    <div
      className={[
        'w-64 rounded-md border bg-surface-1 px-3.5 py-3 text-left shadow-sm transition-colors',
        selected ? 'border-gold/60 ring-1 ring-gold/30' : 'border-line/12',
        isUnresolvedTrap ? 'border-trap/50' : '',
        node.status === 'pending' ? 'opacity-60' : '',
      ].join(' ')}
    >
      {!isRoot && <Handle type="target" position={Position.Top} className="!bg-surface-2/30" />}

      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {isRoot && <Badge>root</Badge>}
        {node.researchMode && <Badge tone="accent">research</Badge>}
        {node.isTrap && <Badge tone={isUnresolvedTrap ? 'danger' : 'success'}>{isUnresolvedTrap ? 'trap' : 'trap resolved'}</Badge>}
        {node.status === 'pending' && <Badge>pending</Badge>}
        {node.status === 'error' && <Badge tone="danger">error</Badge>}
      </div>

      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-fg/90">{node.userQuestion}</p>
      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-fg/50">{node.aiExplanation}</p>

      <Handle type="source" position={Position.Bottom} className="!bg-surface-2/30" />
    </div>
  );
}
