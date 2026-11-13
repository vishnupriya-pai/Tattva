'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { QuestionNode } from '../../lib/workspace-types';
import { computeConceptGraphLayout } from '../../lib/concept-graph-layout';
import { computeNodeMetrics } from '../../lib/graph-metrics';
import {
  CircularConceptNode,
  type CircularConceptNodeType,
} from './CircularConceptNode';
import { EmptyGraphState, ErrorGraphState, LoadingGraphState } from './GraphStates';

const nodeTypes = {
  conceptNode: CircularConceptNode,
};

export type GraphStatus = 'ready' | 'loading' | 'error';

export function KnowledgeGraphCanvas({
  nodes,
  selectedNodeId,
  onSelectNode,
  status,
  errorMessage,
  onRetry,
}: {
  nodes: QuestionNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  status: GraphStatus;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const { positions } = useMemo(
    () => computeConceptGraphLayout(nodes),
    [nodes]
  );
  const metricsMap = useMemo(() => computeNodeMetrics(nodes), [nodes]);

  const flowNodes: CircularConceptNodeType[] = useMemo(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: 'conceptNode',
        data: {
          node,
          isRoot: node.parentNodeId === null,
          metrics: metricsMap.get(node.id) ?? {
            tier: 'initial',
            depth: 0,
            childCount: 0,
            exploredFollowUpsCount: 0,
            relevanceScore: 1,
            conceptTag: 'Concept',
          },
        },
        position: positions[node.id] ?? { x: 0, y: 0 },
        selected: node.id === selectedNodeId,
      })),
    [nodes, positions, selectedNodeId, metricsMap]
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      nodes
        .filter((node) => node.parentNodeId !== null)
        .map((node) => {
          const metrics = metricsMap.get(node.id);
          const isDeep = metrics?.tier === 'deep';
          const isDivergent = metrics?.tier === 'divergent';

          let strokeColor = 'rgba(255, 255, 255, 0.2)';
          if (isDeep) strokeColor = 'rgba(16, 185, 129, 0.6)'; // emerald
          else if (isDivergent) strokeColor = 'rgba(244, 63, 94, 0.5)'; // rose

          return {
            id: `${node.parentNodeId}-${node.id}`,
            source: node.parentNodeId as string,
            target: node.id,
            animated: isDeep,
            style: {
              stroke: strokeColor,
              strokeWidth: isDeep ? 2 : 1.5,
            },
          };
        }),
    [nodes, metricsMap]
  );

  if (status === 'loading' && nodes.length === 0) {
    return <LoadingGraphState />;
  }

  if (status === 'error' && nodes.length === 0) {
    return <ErrorGraphState message={errorMessage ?? 'Something went wrong.'} onRetry={onRetry} />;
  }

  if (nodes.length === 0) {
    return <EmptyGraphState />;
  }

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        colorMode="dark"
        nodesDraggable={true}
        nodesConnectable={false}
        edgesReconnectable={false}
      >
        <Background color="rgba(255,255,255,0.05)" gap={28} size={1} />
        <Controls showInteractive={false} className="!border-white/10 !bg-[#141417] !fill-white" />
        <MiniMap
          position="top-right"
          pannable
          zoomable
          className="!h-20 !w-28 !rounded-lg !border !border-white/10 !bg-[#141417]/90 backdrop-blur-sm"
          maskColor="rgba(0,0,0,0.65)"
          nodeColor={(n) => {
            const data = n.data as CircularConceptNodeType['data'];
            if (data?.metrics?.tier === 'deep') return '#10b981';
            if (data?.metrics?.tier === 'divergent') return '#f43f5e';
            if (data?.metrics?.tier === 'moderate') return '#f59e0b';
            return 'rgba(255,255,255,0.3)';
          }}
        />

        {/* Legend Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#141417]/80 px-3 py-1.5 backdrop-blur-md text-[10px]">
          <span className="text-white/40 uppercase tracking-widest font-semibold">Graph Heatmap:</span>
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="h-2 w-2 rounded-full border border-zinc-500 bg-zinc-800" />
            B&W (Initial)
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
            Yellow (Moderate)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
            Green (Deep Dive)
          </span>
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
            Red (Divergent / Trap)
          </span>
        </div>
      </ReactFlow>
    </div>
  );
}
