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
import type { ConceptGraph } from '@tattva/contracts';
import { analyzeKnowledgeGraph } from '@tattva/graph-analytics';
import type { QuestionNode } from '../../lib/workspace-types';
import { computeConceptGraphLayout } from '../../lib/concept-graph-layout';
import { computeNodeMetrics } from '../../lib/graph-metrics';
import {
  CircularConceptNode,
  type CircularConceptNodeType,
} from './CircularConceptNode';
import { EmptyGraphState, ErrorGraphState, LoadingGraphState } from './GraphStates';
import { useTheme } from '../../context/ThemeContext';

const nodeTypes = {
  conceptNode: CircularConceptNode,
};

export type GraphStatus = 'ready' | 'loading' | 'error';

const EMPTY_CONCEPT_GRAPH: ConceptGraph = { concepts: [], nodeConcepts: [], conceptEdges: [] };

export function KnowledgeGraphCanvas({
  nodes,
  conceptGraph = EMPTY_CONCEPT_GRAPH,
  selectedNodeId,
  onSelectNode,
  status,
  errorMessage,
  onRetry,
}: {
  nodes: QuestionNode[];
  /** Concept layer from the API; analytics degrade gracefully when it is empty. */
  conceptGraph?: ConceptGraph;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  status: GraphStatus;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const { theme } = useTheme();
  const analysis = useMemo(() => analyzeKnowledgeGraph(nodes, conceptGraph), [nodes, conceptGraph]);
  const metricsMap = useMemo(() => computeNodeMetrics(nodes, analysis), [nodes, analysis]);
  const { positions } = useMemo(() => computeConceptGraphLayout(nodes, metricsMap), [nodes, metricsMap]);

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
            mastery: null,
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
          const isUnresolvedTrap = node.isTrap && !node.trapResolvedAt;

          let strokeColor = 'var(--color-line-strong)';
          if (isUnresolvedTrap) strokeColor = 'rgba(244, 63, 94, 0.5)'; // rose: misconception only
          else if (isDeep) strokeColor = 'rgba(16, 185, 129, 0.6)'; // emerald

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
        colorMode={theme}
        style={{ background: 'transparent' }}
        nodesDraggable={true}
        nodesConnectable={false}
        edgesReconnectable={false}
      >
        <Background color="var(--color-line)" gap={28} size={1} />
        <Controls showInteractive={false} className="!border-line !bg-surface-1 !fill-fg" />
        <MiniMap
          position="top-right"
          pannable
          zoomable
          className="!h-20 !w-28 !rounded-[10px] !border !border-line !bg-surface-1/90 backdrop-blur-sm max-[1024px]:!hidden"
          maskColor={theme === 'dark' ? 'rgb(18 17 15 / 0.7)' : 'rgb(246 242 234 / 0.7)'}
          nodeColor={(n) => {
            const data = n.data as CircularConceptNodeType['data'];
            if (data?.node.isTrap && !data.node.trapResolvedAt) return 'var(--color-trap)';
            if (data?.metrics?.tier === 'deep') return 'var(--color-explored)';
            if (data?.metrics?.tier === 'moderate') return 'var(--color-fg-muted)';
            return 'var(--color-line-strong)';
          }}
        />

        {/* Legend Overlay */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface-1/80 px-3 py-1.5 backdrop-blur-md text-xs">
          <span className="text-fg/40 font-semibold">Graph Heatmap:</span>
          <span className="flex items-center gap-1.5 text-fg-muted">
            <span className="h-2 w-2 rounded-full border border-line-strong bg-surface-2" />
            B&W (Initial)
          </span>
          <span className="flex items-center gap-1.5 text-fg-muted">
            <span className="h-2 w-2 rounded-full bg-fg-muted" />
            Gray (Moderate)
          </span>
          <span className="flex items-center gap-1.5 text-explored">
            <span className="h-2 w-2 rounded-full bg-explored" />
            Green (High Mastery)
          </span>
          <span className="flex items-center gap-1.5 text-trap">
            <span className="h-2 w-2 rounded-full bg-trap" />
            Red (Unresolved Trap)
          </span>
        </div>
      </ReactFlow>
    </div>
  );
}
