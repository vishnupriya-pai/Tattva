'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  GitBranch,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { Inquiry } from '@tattva/contracts';

export interface HomeDashboardViewProps {
  inquiries: Inquiry[];
  onSelectInquiry: (inquiryId: string) => void;
  onStartNewInquiry: () => void;
  onDeleteInquiry?: (inquiryId: string) => Promise<void> | void;
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  inquiries,
  onSelectInquiry,
  onStartNewInquiry,
  onDeleteInquiry,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, inquiryId: string) => {
    e.stopPropagation();
    if (!onDeleteInquiry) return;
    setDeletingId(inquiryId);
    try {
      await onDeleteInquiry(inquiryId);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8 text-slate-200">
      {/* 1. Hero Block: Serif + Gold Visual Identity */}
      <div className="space-y-4 text-left border-b border-white/10 pb-8">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-[#c59a67] uppercase tracking-wider bg-[#c59a67]/10 px-2.5 py-0.5 rounded border border-[#c59a67]/30">
            INTELLECTUAL EXECUTION PLATFORM
          </span>
          <span className="text-xs text-slate-500">·</span>
          <span className="font-mono text-xs text-slate-400">
            SYSTEM: ACTIVE
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl text-white font-normal tracking-tight leading-tight">
          Your thinking leaves evidence.
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed font-sans">
          Build deep technical understanding. Challenge your assumptions. Every inquiry you launch grows a persistent, branching knowledge graph tested against adversarial misconceptions.
        </p>

        {/* Primary CTA */}
        <div className="pt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={onStartNewInquiry}
            className="inline-flex items-center gap-2 rounded-xl bg-[#c59a67] px-5 py-3 font-mono text-xs font-bold text-black hover:bg-[#d4a373] transition cursor-pointer shadow-lg shadow-black/40"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>START A NEW INQUIRY</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>

      {/* 2. Learner's Inquiries List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#c59a67]" />
            <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Your Active Knowledge Graphs ({inquiries.length})
            </h2>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            Select an inquiry to enter split-screen workspace
          </span>
        </div>

        {inquiries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#13161b]/50 p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 mx-auto">
              <Sparkles className="w-5 h-5 text-[#c59a67]" />
            </div>
            <p className="text-sm text-slate-300 font-medium">No inquiries initiated yet.</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select &ldquo;Start a new inquiry&rdquo; above to ingest a technical learning source and begin your first-principles crucible.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inquiry) => {
              const formattedDate = new Date(inquiry.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const isConfirming = confirmDeleteId === inquiry.id;
              const isDeleting = deletingId === inquiry.id;

              return (
                <div
                  key={inquiry.id}
                  onClick={() => onSelectInquiry(inquiry.id)}
                  className="rounded-2xl border border-white/10 bg-[#13161b] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#c59a67]/60 transition-all duration-200 cursor-pointer shadow-md group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#c59a67] uppercase tracking-wider bg-[#c59a67]/10 px-2 py-0.5 rounded border border-[#c59a67]/20">
                        {inquiry.title || 'Curated Technical Source'}
                      </span>
                      <span className="text-slate-500 text-xs">·</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {formattedDate}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white group-hover:text-[#c59a67] transition truncate">
                      {inquiry.title || 'Technical Inquiry Workspace'}
                    </h3>

                    <p className="text-xs text-slate-400 font-mono truncate">
                      Inquiry ID: {inquiry.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Delete action with inline confirmation */}
                    {isConfirming ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/60 px-3 py-1.5"
                      >
                        <span className="font-mono text-[11px] text-rose-200">
                          {isDeleting ? 'Deleting…' : 'Delete graph?'}
                        </span>
                        {!isDeleting && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, inquiry.id)}
                              className="rounded px-2 py-0.5 font-mono text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-500 transition cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="rounded px-2 py-0.5 font-mono text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      onDeleteInquiry && (
                        <button
                          type="button"
                          title="Delete inquiry"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(inquiry.id);
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}

                    <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                      <span className="font-mono text-xs text-slate-400 group-hover:text-white transition">
                        Open Graph
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#c59a67] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
