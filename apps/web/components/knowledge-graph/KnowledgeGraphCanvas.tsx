'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
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
  const [showGuidance, setShowGuidance] = useState(true);
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
          onOpenDetails: onSelectNode,
        },
        position: positions[node.id] ?? { x: 0, y: 0 },
        selected: node.id === selectedNodeId,
      })),
    [nodes, positions, selectedNodeId, metricsMap, onSelectNode]
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      nodes
        .filter((node) => node.parentNodeId !== null)
        .map((node) => {
          const metrics = metricsMap.get(node.id);
          const isConquered = node.masteryStatus === 'conquered' || Boolean(node.trapResolvedAt);
          const isChallenged = node.masteryStatus === 'challenged' || (node.isTrap && !node.trapResolvedAt);
          const isDeep = metrics?.tier === 'deep';

          let strokeColor = 'rgba(255, 255, 255, 0.25)';
          let strokeDasharray: string | undefined = undefined;

          if (isConquered) {
            strokeColor = 'rgba(197, 154, 103, 0.85)'; // Radiant Gold
          } else if (isChallenged) {
            strokeColor = 'rgba(245, 158, 11, 0.75)'; // Amber
            strokeDasharray = '5 3';
          } else if (isDeep) {
            strokeColor = 'rgba(16, 185, 129, 0.6)'; // emerald
          } else {
            strokeDasharray = '4 4'; // tentative dotted curve
          }

          return {
            id: `${node.parentNodeId}-${node.id}`,
            source: node.parentNodeId as string,
            target: node.id,
            animated: isConquered || isChallenged,
            style: {
              stroke: strokeColor,
              strokeWidth: isConquered ? 2.5 : isChallenged ? 2 : 1.5,
              strokeDasharray,
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
      {/* Subtle First-Time User Orientation Ribbon */}
      {showGuidance && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 rounded-full border border-white/10 bg-[#12141a]/90 px-3.5 py-1 text-[11px] text-slate-300 backdrop-blur-md shadow-lg font-mono pointer-events-auto">
          <span className="text-[#c59a67] font-bold">✦</span>
          <span>Select any node to inspect synthesis &middot; Conquer traps to branch downstream</span>
          <button
            type="button"
            onClick={() => setShowGuidance(false)}
            className="ml-1 text-slate-500 hover:text-white transition cursor-pointer"
            title="Dismiss guide"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
        proOptions={{ hideAttribution: true }}
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
