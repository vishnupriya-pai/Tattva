'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { QuestionNode } from '../../lib/workspace-types';
import { KnowledgeGraphCanvas, type GraphStatus } from './KnowledgeGraphCanvas';

export function GraphOverlay({
  onClose,
  nodes,
  selectedNodeId,
  onSelectNode,
  status,
  errorMessage,
  onRetry,
}: {
  onClose: () => void;
  nodes: QuestionNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  status: GraphStatus;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Knowledge Map" className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold text-fg">Knowledge Map</h2>
          <span className="font-mono text-xs text-fg-muted">
            {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} · select one to open it
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close knowledge map"
          className="rounded-lg p-1.5 text-fg-muted hover:text-fg hover:bg-surface-2 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <KnowledgeGraphCanvas
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={(nodeId) => {
            onSelectNode(nodeId);
            onClose();
          }}
          status={status}
          errorMessage={errorMessage}
          onRetry={onRetry}
        />
      </div>
    </div>
  );
}
