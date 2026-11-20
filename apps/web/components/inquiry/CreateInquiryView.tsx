'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { DEMO_LEARNING_SOURCE_ID } from '../../lib/workspace-bootstrap';

export const GENERAL_LEARNING_SOURCE_ID = '33333333-3333-4333-8333-333333333333';
export const ATTENTION_LEARNING_SOURCE_ID = '22222222-2222-4222-8222-222222222222';

export function deriveTitleFromQuestion(q: string): string {
  const trimmed = q.trim();
  if (!trimmed) return '';
  const firstLine = trimmed.split('\n')[0]?.trim() ?? trimmed;
  let clean = firstLine
    .replace(/^(what is|what are|how does|how do|explain|describe|analyze|why does|why do|can you explain|compare|evaluate)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
  if (clean.length > 65) {
    clean = clean.slice(0, 62) + '…';
  }
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
}

export interface CreateInquiryViewProps {
  initialQuestion?: string;
  initialSourceId?: string;
  onCreateInquiry: (payload: {
    question: string;
    learningSourceId: string;
    title: string;
    researchMode: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CURATED_SOURCES = [
  {
    id: GENERAL_LEARNING_SOURCE_ID,
    title: 'Custom Engineering & Systems Inquiry',
    duration: '40 min',
    sourceType: 'document',
    topic: 'Any CS, AI, or Engineering Topic',
    description: 'Explore any technical domain (databases, operating systems, networking, algorithms, distributed systems) with its own isolated knowledge graph and dedicated context.',
    sampleQuestion: 'How do LSM-Trees achieve high write throughput compared to B-Trees, and what is write amplification?',
  },
  {
    id: ATTENTION_LEARNING_SOURCE_ID,
    title: 'Attention Is All You Need: Transformers & Multi-Head Attention',
    duration: '45 min',
    sourceType: 'document',
    topic: 'Deep Learning & Neural Architectures',
    description: 'The foundational 2017 paper by Vaswani et al. introducing the Transformer architecture, self-attention mechanisms, and parallelized sequence transduction.',
    sampleQuestion: 'How does multi-head self-attention allow the model to jointly attend to information from different representation subspaces, and why does this outperform recurrence?',
  },
  {
    id: DEMO_LEARNING_SOURCE_ID,
    title: 'Memory Arena Allocators: Design and Trade-offs',
    duration: '38 min',
    sourceType: 'transcript',
    topic: 'Systems Programming & Memory Management',
    description: 'A dense walkthrough of arena/bump allocators, free-list strategies, and fragmentation trade-offs.',
    sampleQuestion: 'What is a bump pointer and how does arena allocation work?',
  },
];

export const CreateInquiryView: React.FC<CreateInquiryViewProps> = ({
  initialQuestion = '',
  initialSourceId,
  onCreateInquiry,
  onCancel,
  isSubmitting = false,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(initialSourceId || GENERAL_LEARNING_SOURCE_ID);
  const [question, setQuestion] = useState<string>(initialQuestion);
  const [inquiryTitle, setInquiryTitle] = useState<string>(() => deriveTitleFromQuestion(initialQuestion));
  const [userEditedTitle, setUserEditedTitle] = useState<boolean>(false);
  const [researchMode, setResearchMode] = useState<boolean>(false);

  const selectedSource = CURATED_SOURCES.find((s) => s.id === selectedSourceId) ?? CURATED_SOURCES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isSubmitting) return;

    const qLower = question.toLowerCase();
    let resolvedSourceId = selectedSourceId;
    let finalTitle = inquiryTitle.trim() || deriveTitleFromQuestion(question);

    if (qLower.includes('transformer') || qLower.includes('attention is all you need') || qLower.includes('multi-head attention')) {
      resolvedSourceId = ATTENTION_LEARNING_SOURCE_ID;
      if (!finalTitle) finalTitle = 'Attention & Transformers Architecture';
    } else if (qLower.includes('arena') || qLower.includes('bump pointer')) {
      resolvedSourceId = DEMO_LEARNING_SOURCE_ID;
      if (!finalTitle) finalTitle = 'Memory Arena Allocators';
    } else {
      if (resolvedSourceId === ATTENTION_LEARNING_SOURCE_ID || resolvedSourceId === DEMO_LEARNING_SOURCE_ID) {
        resolvedSourceId = GENERAL_LEARNING_SOURCE_ID;
      }
      if (!finalTitle) {
        finalTitle = 'Technical Systems Inquiry';
      }
    }

    onCreateInquiry({
      question: question.trim(),
      learningSourceId: resolvedSourceId,
      title: finalTitle,
      researchMode,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8 text-fg">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-1 px-3 py-1.5 font-mono text-xs text-fg-muted hover:text-fg hover:border-line-strong transition cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>

        <span className="font-mono text-xs font-bold text-fg-muted bg-surface-2 px-2.5 py-0.5 rounded-[6px]">
          PRD §1 &middot; Process of Inquiry
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h1 className="text-3xl text-fg font-normal">
            Launch Technical Inquiry
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-fg-muted font-sans leading-relaxed">
            Attach your inquiry to a verified, high-friction technical source (&ge;25 min baseline). Asking your root question begins your branching Knowledge Graph.
          </p>
        </div>

        {/* Step 1: Select Curated Source */}
        <div className="space-y-3">
          <label className="block font-mono text-xs font-bold text-fg-body ">
            1. Select Curated Learning Source (&ge; 25 min)
          </label>

          <div className="space-y-2">
            {CURATED_SOURCES.map((src) => {
              const isSelected = src.id === selectedSourceId;
              return (
                <div
                  key={src.id}
                  onClick={() => setSelectedSourceId(src.id)}
                  className={`rounded-xl border p-4 cursor-pointer transition ${
                    isSelected
                      ? 'border-fg bg-surface-2 shadow-md shadow-black/40'
                      : 'border-line bg-surface-1 hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-fg-muted bg-surface-2 px-2 py-0.5 rounded-[6px]">
                          {src.topic}
                        </span>
                        <span className="font-mono text-xs text-fg-muted">
                          {src.duration}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-fg">
                        {src.title}
                      </h3>
                      <p className="text-xs text-fg-muted leading-relaxed">
                        {src.description}
                      </p>
                    </div>

                    <BookOpen
                      className={`w-5 h-5 shrink-0 ${
                        isSelected ? 'text-fg' : 'text-fg-muted'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Formulate Root Question */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block font-mono text-xs font-bold text-fg-body ">
              2. Formulate Your Root Question / Technical Excerpt
            </label>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-xs ${question.length > 5500 ? 'text-trap font-bold' : 'text-fg-muted'}`}>
                {question.length.toLocaleString()} / 6,000
              </span>
              {selectedSource?.sampleQuestion && (
                <button
                  type="button"
                  onClick={() => {
                    setQuestion(selectedSource.sampleQuestion);
                    if (!userEditedTitle) {
                      setInquiryTitle(selectedSource.title);
                    }
                  }}
                  className="text-xs font-mono text-fg-muted hover:text-fg hover:underline cursor-pointer"
                >
                  Use sample prompt
                </button>
              )}
            </div>
          </div>

          <textarea
            rows={5}
            value={question}
            onChange={(e) => {
              const newQ = e.target.value;
              setQuestion(newQ);
              if (!userEditedTitle) {
                setInquiryTitle(deriveTitleFromQuestion(newQ));
              }
            }}
            disabled={isSubmitting}
            maxLength={6000}
            placeholder="Paste your technical passage or formulate the foundational mechanism / trade-off you want to explore..."
            className="w-full rounded-xl border border-line-strong bg-surface-1 px-4 py-3 text-sm text-fg placeholder-fg-faint focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50 font-sans leading-relaxed"
          />

          {/* Inquiry Heading Input */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="block font-mono text-xs font-bold text-fg-body ">
                Inquiry Heading (auto-generated from your question)
              </label>
              <span className="text-xs font-mono text-fg-muted">
                Displayed in Knowledge Graph & Switcher
              </span>
            </div>
            <input
              type="text"
              value={inquiryTitle}
              onChange={(e) => {
                setInquiryTitle(e.target.value);
                setUserEditedTitle(true);
              }}
              disabled={isSubmitting}
              placeholder="e.g. LSM Trees: Write Amplification & Compaction"
              className="w-full rounded-xl border border-line-strong bg-surface-1 px-4 py-2.5 text-xs text-fg placeholder-fg-faint focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50 font-sans"
            />
          </div>
        </div>

        {/* Step 3: Research Mode Toggle */}
        <div className="rounded-xl border border-line bg-surface-1 p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-fg ">
                Research Mode
              </span>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded border ${
                  researchMode
                    ? 'text-gold bg-gold/10 border-gold/30'
                    : 'text-fg-muted bg-surface-2 border-line'
                }`}
              >
                3× Cognitive Stamina
              </span>
            </div>
            <p className="text-xs text-fg-muted leading-relaxed">
              Enforces Socratic responses, citation-backed primary proofs, and adversarial traps.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={researchMode}
            onClick={() => setResearchMode((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
              researchMode ? 'border-gold/50 bg-gold/20' : 'border-line-strong bg-surface-2/10'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-surface-2 transition-transform ${
                researchMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!question.trim() || isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-mono text-xs font-bold text-gold-ink hover:bg-gold-hover transition cursor-pointer shadow-lg shadow-black/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Synthesizing Inquiry with Sarvam AI…</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-gold-ink" />
                <span>Initialize knowledge graph</span>
                <ArrowRight className="w-4 h-4 text-gold-ink" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
