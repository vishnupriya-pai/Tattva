'use client';

import { X } from 'lucide-react';
import type { QuestionNode } from '../../lib/workspace-types';
import { KnowledgeGraphCanvas, type GraphStatus } from './KnowledgeGraphCanvas';

export function GraphOverlay({
  isOpen,
  onClose,
  nodes,
  selectedNodeId,
  onSelectNode,
  status,
  errorMessage,
  onRetry,
}: {
  isOpen: boolean;
  onClose: () => void;
  nodes: QuestionNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  status: GraphStatus;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0b0d] animate-in fade-in duration-150">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">Knowledge Map</h2>
        <button
          type="button"
          onClick={onClose}
          title="Close knowledge map"
          className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
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
