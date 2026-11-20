'use client';

import React, { useState } from 'react';
import type { LearningSource, QuestionNode } from '../../lib/workspace-types';
import { Panel } from '../shared/Panel';
import { Badge } from '../shared/Badge';
import { SourceMetadata } from './SourceMetadata';
import { BookOpen, Network, HelpCircle, Sparkles } from 'lucide-react';

export function SourceViewer({
  source,
  body,
  activeNode,
}: {
  source: LearningSource;
  body: string;
  activeNode?: QuestionNode | null;
}) {
  const [activeTab, setActiveTab] = useState<'source' | 'node'>('source');

  return (
    <Panel
      title="Source material"
      className="h-full border-r border-line"
      actions={
        activeNode ? (
          <div className="inline-flex rounded-lg border border-line bg-surface-1 p-0.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('source')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer ${
                activeTab === 'source'
                  ? 'bg-gold font-semibold text-gold-ink shadow'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Source Material</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('node')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer ${
                activeTab === 'node'
                  ? 'bg-gold font-semibold text-gold-ink shadow'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Network className="w-3 h-3" />
              <span>Graph Node</span>
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex h-full flex-col overflow-y-auto">
        {activeTab === 'source' || !activeNode ? (
          <>
            <div className="shrink-0 space-y-3 border-b border-line px-6 py-5">
              <div className="flex items-center gap-2">
                <Badge tone="accent">{source.sourceType}</Badge>
                <span className="font-mono text-[10px] text-fg-muted uppercase tracking-wider">
                  Verified Curated Ingestion
                </span>
              </div>
              <h1 className="text-xl font-semibold leading-snug text-fg font-serif">{source.title}</h1>
              <p className="text-sm leading-relaxed text-fg/60 font-sans">{source.description}</p>
              <SourceMetadata source={source} />
            </div>

            <article className="flex-1 whitespace-pre-line px-6 py-6 text-[15px] leading-7 text-fg/80 font-sans">
              {body}
            </article>
          </>
        ) : (
          <div className="flex-1 space-y-6 px-6 py-5">
            <div className="space-y-3 border-b border-line pb-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-gold uppercase tracking-wider bg-gold/10 px-2.5 py-0.5 rounded border border-gold/30">
                  {activeNode.parentNodeId ? 'Branching Node' : 'Root Question'}
                </span>
                {activeNode.researchMode && (
                  <span className="font-mono text-[10px] text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                    Research Mode Active
                  </span>
                )}
                {activeNode.isTrap && (
                  <span className="font-mono text-[10px] text-trap bg-trap-wash px-2 py-0.5 rounded border border-trap/30">
                    {activeNode.trapResolvedAt ? 'Trap Resolved' : 'Adversarial Trap'}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  Inquiry Formulation
                </span>
                <h2 className="text-lg font-semibold text-fg leading-relaxed">
                  {activeNode.userQuestion}
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-gold">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span>Sarvam AI Socratic Synthesis</span>
              </div>
              <div className="rounded-xl border border-line bg-surface-1 p-4 text-sm leading-relaxed text-fg-body">
                {activeNode.aiExplanation}
              </div>
            </div>

            {activeNode.followUps && activeNode.followUps.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                  <HelpCircle className="w-3.5 h-3.5 text-fg-muted" />
                  <span>Probing Concept Follow-ups</span>
                </div>
                <div className="space-y-2">
                  {activeNode.followUps.map((fu, idx) => (
                    <div
                      key={fu.id}
                      className="rounded-lg border border-line bg-surface-1/60 px-3.5 py-2.5 text-xs text-fg-body flex items-start gap-2.5"
                    >
                      <span className="font-mono text-gold font-bold shrink-0">{idx + 1}.</span>
                      <span className="leading-relaxed">{fu.questionText}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
