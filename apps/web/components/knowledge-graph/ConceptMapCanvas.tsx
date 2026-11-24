'use client';

import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ConceptGraph } from '@tattva/contracts';
import type { KnowledgeGraphAnalysis } from '@tattva/graph-analytics';
import {
  buildConceptMap,
  layoutConceptMap,
  layoutLinks,
  neighbourIds,
  type ConceptMapModel,
} from '../../lib/concept-map';
import { useTheme } from '../../context/ThemeContext';
import { CONCEPT_NODE_WIDTH, ConceptBubbleNode, type ConceptBubbleNodeType } from './ConceptBubbleNode';
import { FloatingRelationEdge, type RelationEdgeType } from './FloatingRelationEdge';

const nodeTypes = { conceptBubble: ConceptBubbleNode };
const edgeTypes = { relation: FloatingRelationEdge };

/** Community ring colours; mid-saturation so they read on both themes. */
const COMMUNITY_HUES = [35, 160, 210, 280, 0, 95, 320, 190];
export function communityRing(communityId: number): string {
  const hue = COMMUNITY_HUES[Math.abs(communityId) % COMMUNITY_HUES.length];
  return `hsl(${hue} 55% 55% / 0.55)`;
}

function Canvas({
  graph,
  model,
  selectedConceptId,
  onSelectConcept,
}: {
  graph: ConceptGraph;
  model: ConceptMapModel;
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string | null) => void;
}) {
  const { theme } = useTheme();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const focusId = hoveredId ?? selectedConceptId;

  const centres = useMemo(
    () => layoutConceptMap(model.nodes, layoutLinks(graph, new Set(model.nodes.map((n) => n.id)))),
    [graph, model.nodes],
  );
  const focusNeighbours = useMemo(
    () => (focusId ? neighbourIds(model.edges, focusId) : null),
    [focusId, model.edges],
  );

  const nodes: ConceptBubbleNodeType[] = useMemo(
    () =>
      model.nodes.map((c) => {
        const centre = centres[c.id] ?? { x: 0, y: 0 };
        return {
          id: c.id,
          type: 'conceptBubble',
          position: { x: centre.x - CONCEPT_NODE_WIDTH / 2, y: centre.y - c.radius },
          selected: c.id === selectedConceptId,
          data: {
            name: c.name,
            radius: c.radius,
            status: c.status,
            ring: communityRing(c.communityId),
            isKeystone: c.isKeystone,
            mentionCount: c.mentionCount,
            dimmed: Boolean(focusId && c.id !== focusId && !focusNeighbours?.has(c.id)),
          },
        };
      }),
    [model.nodes, centres, selectedConceptId, focusId, focusNeighbours],
  );

  const edges: RelationEdgeType[] = useMemo(
    () =>
      model.edges.map((e) => {
        const touchesFocus = Boolean(focusId && (e.source === focusId || e.target === focusId));
        return {
          id: e.id,
          type: 'relation',
          source: e.source,
          target: e.target,
          markerEnd: e.directed
            ? {
                type: MarkerType.ArrowClosed,
                width: 14,
                height: 14,
                color: touchesFocus ? 'var(--color-gold)' : 'var(--color-fg-muted)',
              }
            : undefined,
          data: {
            label: e.label,
            predicted: e.predicted,
            showLabel: touchesFocus,
            dimmed: Boolean(focusId && !touchesFocus),
            opacity: Math.min(0.9, 0.35 + e.confidence * 0.5),
          },
        };
      }),
    [model.edges, focusId],
  );

  return (
    <ReactFlow
      // Remount (and so re-fit) whenever the set of concepts changes.
      key={model.nodes.map((n) => n.id).join(',')}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={(_, node) => onSelectConcept(node.id === selectedConceptId ? null : node.id)}
      onNodeMouseEnter={(_, node) => setHoveredId(node.id)}
      onNodeMouseLeave={() => setHoveredId(null)}
      onPaneClick={() => onSelectConcept(null)}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      colorMode={theme}
      style={{ background: 'transparent' }}
      nodesDraggable
      nodesConnectable={false}
      edgesReconnectable={false}
    >
      <Background color="var(--color-line)" gap={28} size={1} />
      <Controls showInteractive={false} className="!border-line !bg-surface-1 !fill-fg" />
    </ReactFlow>
  );
}

export function ConceptMapCanvas({
  graph,
  analysis,
  selectedConceptId,
  onSelectConcept,
}: {
  graph: ConceptGraph;
  analysis: KnowledgeGraphAnalysis;
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string | null) => void;
}) {
  const model = useMemo(() => buildConceptMap(graph, analysis), [graph, analysis]);
  return (
    <div className="relative h-full w-full">
      <ReactFlowProvider>
        <Canvas
          graph={graph}
          model={model}
          selectedConceptId={selectedConceptId}
          onSelectConcept={onSelectConcept}
        />
      </ReactFlowProvider>
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface-1/85 px-3 py-1.5 text-xs text-fg-muted backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-fg-muted/50 bg-surface-2" /> Touched
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-explored/70 bg-explored/35" /> Explored
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-explored" /> Mastered
        </span>
        <span className="flex items-center gap-1.5 text-trap">
          <span className="h-2.5 w-2.5 rounded-full border border-trap bg-trap-wash" /> Misconception
        </span>
        <span className="text-fg-faint">· size = questions · ring = cluster · dashed = suggested link</span>
        {model.hiddenCount > 0 && <span className="text-fg-faint">· {model.hiddenCount} minor concepts hidden</span>}
      </div>
    </div>
  );
}
