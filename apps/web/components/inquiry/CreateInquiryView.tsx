'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { DEMO_LEARNING_SOURCE_ID } from '../../lib/workspace-bootstrap';

export interface CreateInquiryViewProps {
  initialQuestion?: string;
  initialSourceId?: string;
  onCreateInquiry: (payload: {
    question: string;
    learningSourceId: string;
    researchMode: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CURATED_SOURCES = [
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
  initialSourceId = DEMO_LEARNING_SOURCE_ID,
  onCreateInquiry,
  onCancel,
  isSubmitting = false,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(initialSourceId);
  const [question, setQuestion] = useState<string>(initialQuestion);
  const [researchMode, setResearchMode] = useState<boolean>(false);

  const selectedSource = CURATED_SOURCES.find((s) => s.id === selectedSourceId) ?? CURATED_SOURCES[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isSubmitting) return;

    onCreateInquiry({
      question: question.trim(),
      learningSourceId: selectedSourceId,
      researchMode,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8 text-slate-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#13161b] px-3 py-1.5 font-mono text-xs text-slate-400 hover:text-white hover:border-[#c59a67]/60 transition cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>

        <span className="font-mono text-[10px] font-bold text-[#c59a67] uppercase tracking-wider bg-[#c59a67]/10 px-2.5 py-0.5 rounded border border-[#c59a67]/30">
          PRD §1 &middot; Process of Inquiry
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h1 className="text-3xl text-white font-normal">
            Launch Technical Inquiry
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
            Attach your inquiry to a verified, high-friction technical source (&ge;25 min baseline). Asking your root question begins your branching Knowledge Graph.
          </p>
        </div>

        {/* Step 1: Select Curated Source */}
        <div className="space-y-3">
          <label className="block font-mono text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                      ? 'border-[#c59a67] bg-[#c59a67]/5 shadow-md shadow-black/40'
                      : 'border-white/10 bg-[#13161b] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#c59a67] bg-[#c59a67]/10 px-2 py-0.5 rounded border border-[#c59a67]/30">
                          {src.topic}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {src.duration}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">
                        {src.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {src.description}
                      </p>
                    </div>

                    <BookOpen
                      className={`w-5 h-5 shrink-0 ${
                        isSelected ? 'text-[#c59a67]' : 'text-slate-500'
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
            <label className="block font-mono text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Formulate Your Root Question
            </label>
            {selectedSource?.sampleQuestion && (
              <button
                type="button"
                onClick={() => setQuestion(selectedSource.sampleQuestion)}
                className="text-[11px] font-mono text-[#c59a67] hover:underline cursor-pointer"
              >
                Use sample prompt
              </button>
            )}
          </div>

          <textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isSubmitting}
            placeholder="What foundational mechanism or trade-off in the material do you want to break down?"
            className="w-full rounded-xl border border-white/15 bg-[#13161b] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#c59a67] focus:outline-none focus:ring-1 focus:ring-[#c59a67] disabled:opacity-50"
          />
        </div>

        {/* Step 3: Research Mode Toggle */}
        <div className="rounded-xl border border-white/10 bg-[#13161b] p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                Research Mode
              </span>
              <span className="font-mono text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                3× Cognitive Stamina
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforces Socratic responses, citation-backed primary proofs, and adversarial traps.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={researchMode}
            onClick={() => setResearchMode((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
              researchMode ? 'border-amber-400/50 bg-amber-400/20' : 'border-white/20 bg-white/10'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c59a67] py-3.5 font-mono text-xs font-bold text-black hover:bg-[#d4a373] transition cursor-pointer shadow-lg shadow-black/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>Synthesizing Inquiry with Sarvam AI…</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>INITIALIZE KNOWLEDGE GRAPH</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
