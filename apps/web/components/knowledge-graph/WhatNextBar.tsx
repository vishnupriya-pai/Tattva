'use client';

import { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import type { KnowledgeGraphAnalysis } from '@tattva/graph-analytics';

export interface DiscoverResult {
  added: number;
  considered: number;
}

const MAX_ITEMS = 3;

/** "What next" strip under the concept map: prerequisite gaps, open threads, hidden-link discovery. */
export function WhatNextBar({
  analysis,
  onSelectConcept,
  onOpenQuestion,
  onDiscoverConnections,
}: {
  analysis: KnowledgeGraphAnalysis;
  onSelectConcept: (conceptId: string) => void;
  onOpenQuestion: (nodeId: string) => void;
  onDiscoverConnections?: () => Promise<DiscoverResult>;
}) {
  const [discovering, setDiscovering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const nameOf = (id: string) => analysis.concepts[id]?.name ?? 'a concept';
  const gaps = analysis.prerequisiteGaps.slice(0, MAX_ITEMS);
  const threads = analysis.frontier.filter((f) => !f.blockedByTrap).slice(0, MAX_ITEMS);

  async function discover() {
    if (!onDiscoverConnections || discovering) return;
    setDiscovering(true);
    setMessage(null);
    try {
      const { added, considered } = await onDiscoverConnections();
      setMessage(
        considered === 0
          ? 'No new candidate links yet. Ask a few more questions first.'
          : added === 0
            ? `Checked ${considered} possible links; none held up.`
            : `Found ${added} new ${added === 1 ? 'link' : 'links'} (dashed).`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not look for connections. Try again.');
    } finally {
      setDiscovering(false);
    }
  }

  return (
    <footer className="flex shrink-0 flex-col gap-2 border-t border-line bg-surface-1 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
        <span className="font-mono uppercase tracking-wide text-fg-faint">What next</span>
        {gaps.map((g) => (
          <button
            key={`${g.prerequisiteConceptId}-${g.dependentConceptId}`}
            type="button"
            onClick={() => onSelectConcept(g.prerequisiteConceptId)}
            title="A foundation for something you've studied, but not yet studied itself"
            className="cursor-pointer rounded-full border border-gold-line bg-gold-wash px-2.5 py-1 text-fg transition hover:border-gold"
          >
            Learn {nameOf(g.prerequisiteConceptId)} (needed for {nameOf(g.dependentConceptId)})
          </button>
        ))}
        {threads.map((t) => (
          <button
            key={t.followUpId}
            type="button"
            onClick={() => onOpenQuestion(t.nodeId)}
            title={t.questionText}
            className="max-w-[260px] cursor-pointer truncate rounded-full border border-line px-2.5 py-1 text-fg-muted transition hover:border-line-strong hover:text-fg"
          >
            {t.questionText}
          </button>
        ))}
        {gaps.length === 0 && threads.length === 0 && <span className="text-fg-muted">Nothing open. Ask something new.</span>}
      </div>
      {onDiscoverConnections && (
        <div className="flex shrink-0 items-center gap-2">
          {message && <span className="text-fg-muted">{message}</span>}
          <button
            type="button"
            onClick={() => void discover()}
            disabled={discovering}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-fg transition hover:bg-surface-2 disabled:cursor-wait disabled:opacity-60"
          >
            {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Find connections
          </button>
        </div>
      )}
    </footer>
  );
}
