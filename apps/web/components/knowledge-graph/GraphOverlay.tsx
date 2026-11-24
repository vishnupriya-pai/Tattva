'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { ConceptGraph } from '@tattva/contracts';
import { analyzeKnowledgeGraph } from '@tattva/graph-analytics';
import type { QuestionNode } from '../../lib/workspace-types';
import { KnowledgeGraphCanvas, type GraphStatus } from './KnowledgeGraphCanvas';
import { ConceptMapCanvas } from './ConceptMapCanvas';
import { ConceptDetailsPanel } from './ConceptDetailsPanel';
import { WhatNextBar, type DiscoverResult } from './WhatNextBar';
import { EmptyGraphState, ErrorGraphState, LoadingGraphState } from './GraphStates';

type MapView = 'concepts' | 'history';

const EMPTY_CONCEPT_GRAPH: ConceptGraph = { concepts: [], nodeConcepts: [], conceptEdges: [] };

/**
 * Full-screen Knowledge Map. "Concepts" (default) draws ideas and how they
 * relate; "History" is the question tree in the order it was asked.
 */
export function GraphOverlay({
  onClose,
  nodes,
  conceptGraph = EMPTY_CONCEPT_GRAPH,
  selectedNodeId,
  onSelectNode,
  onDiscoverConnections,
  status,
  errorMessage,
  onRetry,
}: {
  onClose: () => void;
  nodes: QuestionNode[];
  conceptGraph?: ConceptGraph;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onDiscoverConnections?: () => Promise<DiscoverResult>;
  status: GraphStatus;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const hasConcepts = conceptGraph.concepts.length > 0;
  const [view, setView] = useState<MapView>(hasConcepts ? 'concepts' : 'history');
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const analysis = useMemo(() => analyzeKnowledgeGraph(nodes, conceptGraph), [nodes, conceptGraph]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openQuestion = (nodeId: string) => {
    onSelectNode(nodeId);
    onClose();
  };

  const clusters = analysis.communities.filter((c) => c.conceptIds.length > 1).length;
  const summary =
    view === 'concepts'
      ? `${analysis.coverage.conceptCount} concepts · ${conceptGraph.conceptEdges.length} links · ${clusters} ${clusters === 1 ? 'cluster' : 'clusters'} · ${analysis.coverage.masteredCount} mastered`
      : `${nodes.length} ${nodes.length === 1 ? 'question' : 'questions'} · select one to open it`;

  function conceptBody() {
    if (status === 'loading' && nodes.length === 0) return <LoadingGraphState />;
    if (status === 'error' && nodes.length === 0)
      return <ErrorGraphState message={errorMessage ?? 'Something went wrong.'} onRetry={onRetry} />;
    if (nodes.length === 0) return <EmptyGraphState />;
    if (!hasConcepts)
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-fg-muted">
          Concepts appear here as you ask questions. Older questions can be indexed with the backfill script.
        </div>
      );
    return (
      <ConceptMapCanvas
        graph={conceptGraph}
        analysis={analysis}
        selectedConceptId={selectedConceptId}
        onSelectConcept={setSelectedConceptId}
      />
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Knowledge Map" className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="shrink-0 text-sm font-semibold text-fg">Knowledge Map</h2>
          <div role="tablist" aria-label="Map view" className="flex shrink-0 rounded-lg border border-line p-0.5 text-xs">
            {(['concepts', 'history'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`cursor-pointer rounded-md px-2.5 py-1 capitalize transition ${
                  view === v ? 'bg-surface-2 font-semibold text-fg' : 'text-fg-muted hover:text-fg'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <span className="hidden truncate font-mono text-xs text-fg-muted sm:inline">{summary}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close knowledge map"
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-fg-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        {view === 'concepts' ? (
          <>
            {conceptBody()}
            {selectedConceptId && analysis.concepts[selectedConceptId] && (
              <ConceptDetailsPanel
                conceptId={selectedConceptId}
                graph={conceptGraph}
                analysis={analysis}
                nodes={nodes}
                onSelectConcept={setSelectedConceptId}
                onOpenQuestion={openQuestion}
                onClose={() => setSelectedConceptId(null)}
              />
            )}
          </>
        ) : (
          <KnowledgeGraphCanvas
            nodes={nodes}
            conceptGraph={conceptGraph}
            selectedNodeId={selectedNodeId}
            onSelectNode={openQuestion}
            status={status}
            errorMessage={errorMessage}
            onRetry={onRetry}
          />
        )}
      </div>

      {view === 'concepts' && hasConcepts && (
        <WhatNextBar
          analysis={analysis}
          onSelectConcept={setSelectedConceptId}
          onOpenQuestion={openQuestion}
          onDiscoverConnections={onDiscoverConnections}
        />
      )}
    </div>
  );
}
