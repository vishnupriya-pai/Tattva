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
      className="h-full border-r border-white/10"
      actions={
        activeNode ? (
          <div className="inline-flex rounded-lg border border-white/10 bg-[#13161b] p-0.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('source')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition cursor-pointer ${
                activeTab === 'source'
                  ? 'bg-[#c59a67] font-semibold text-black shadow'
                  : 'text-slate-400 hover:text-white'
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
                  ? 'bg-[#c59a67] font-semibold text-black shadow'
                  : 'text-slate-400 hover:text-white'
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
            <div className="shrink-0 space-y-3 border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-2">
                <Badge tone="accent">{source.sourceType}</Badge>
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                  Verified Curated Ingestion
                </span>
              </div>
              <h1 className="text-xl font-semibold leading-snug text-white font-serif">{source.title}</h1>
              <p className="text-sm leading-relaxed text-white/60 font-sans">{source.description}</p>
              <SourceMetadata source={source} />
            </div>

            <article className="flex-1 whitespace-pre-line px-6 py-6 text-[15px] leading-7 text-white/80 font-sans">
              {body}
            </article>
          </>
        ) : (
          <div className="flex-1 space-y-6 px-6 py-5">
            <div className="space-y-3 border-b border-white/10 pb-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-[#c59a67] uppercase tracking-wider bg-[#c59a67]/10 px-2.5 py-0.5 rounded border border-[#c59a67]/30">
                  {activeNode.parentNodeId ? 'Branching Node' : 'Root Question'}
                </span>
                {activeNode.researchMode && (
                  <span className="font-mono text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                    Research Mode Active
                  </span>
                )}
                {activeNode.isTrap && (
                  <span className="font-mono text-[10px] text-rose-300 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/30">
                    {activeNode.trapResolvedAt ? 'Trap Resolved' : 'Adversarial Trap'}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Inquiry Formulation
                </span>
                <h2 className="text-lg font-semibold text-white leading-relaxed">
                  {activeNode.userQuestion}
                </h2>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#c59a67]">
                <Sparkles className="w-3.5 h-3.5 text-[#c59a67]" />
                <span>Sarvam AI Socratic Synthesis</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#13161b] p-4 text-sm leading-relaxed text-slate-300">
                {activeNode.aiExplanation}
              </div>
            </div>

            {activeNode.followUps && activeNode.followUps.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Probing Concept Follow-ups</span>
                </div>
                <div className="space-y-2">
                  {activeNode.followUps.map((fu, idx) => (
                    <div
                      key={fu.id}
                      className="rounded-lg border border-white/5 bg-[#13161b]/60 px-3.5 py-2.5 text-xs text-slate-300 flex items-start gap-2.5"
                    >
                      <span className="font-mono text-[#c59a67] font-bold shrink-0">{idx + 1}.</span>
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
