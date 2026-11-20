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
  conqueredInquiryIds?: string[];
}

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  inquiries,
  onSelectInquiry,
  onStartNewInquiry,
  onDeleteInquiry,
  conqueredInquiryIds = [],
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
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8 text-fg">
      {/* 1. Hero Block: Serif + Gold Visual Identity */}
      <div className="space-y-4 text-left border-b border-line pb-8">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-fg-muted bg-surface-2 px-2.5 py-0.5 rounded">
            Intellectual execution platform
          </span>
          <span className="text-xs text-fg-muted">·</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-live" />
            System active
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl text-fg font-normal tracking-tight leading-tight">
          Your thinking leaves evidence.
        </h1>

        <p className="text-sm sm:text-base text-fg-muted max-w-2xl leading-relaxed font-sans">
          Build deep technical understanding. Challenge your assumptions. Every inquiry you launch grows a persistent, branching knowledge graph tested against adversarial misconceptions.
        </p>

        {/* Primary CTA */}
        <div className="pt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={onStartNewInquiry}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-mono text-xs font-bold text-gold-ink hover:bg-gold-hover transition cursor-pointer shadow-lg shadow-black/40"
          >
            <Plus className="w-4 h-4 text-gold-ink" />
            <span>Start a new inquiry</span>
            <ArrowRight className="w-4 h-4 text-gold-ink" />
          </button>
        </div>
      </div>

      {/* 2. Learner's Inquiries List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-fg-muted" />
            <h2 className="font-mono text-xs font-bold text-fg ">
              Your Active Knowledge Graphs ({inquiries.length})
            </h2>
          </div>
          <span className="font-mono text-xs text-fg-muted">
            Select an inquiry to enter split-screen workspace
          </span>
        </div>

        {inquiries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface-1/50 p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-surface-2/5 flex items-center justify-center text-fg-muted mx-auto">
              <Sparkles className="w-5 h-5 text-fg-faint" />
            </div>
            <p className="text-sm text-fg-body font-medium">No inquiries initiated yet.</p>
            <p className="text-xs text-fg-muted max-w-md mx-auto">
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
              const isConquered = conqueredInquiryIds.includes(inquiry.id);

              return (
                <div
                  key={inquiry.id}
                  onClick={() => onSelectInquiry(inquiry.id)}
                  className="rounded-2xl border border-line bg-surface-1 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-line-strong transition-all duration-200 cursor-pointer shadow-md group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-fg-muted bg-surface-2 px-2 py-0.5 rounded">
                        {inquiry.title || 'Curated Technical Source'}
                      </span>
                      <span className="text-fg-muted text-xs">·</span>
                      <span className="font-mono text-xs text-fg-muted">
                        {formattedDate}
                      </span>
                      {isConquered && (
                        <>
                          <span className="text-fg-muted text-xs">·</span>
                          <span className="font-mono text-xs text-live ">
                            Conquered
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-fg truncate">
                      {inquiry.title || 'Technical Inquiry Workspace'}
                    </h3>

                    <p className="text-xs text-fg-muted font-mono truncate">
                      Inquiry ID: {inquiry.id}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Delete action with inline confirmation */}
                    {isConfirming ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 rounded-xl border border-trap/30 bg-trap-wash px-3 py-1.5"
                      >
                        <span className="font-mono text-xs text-trap">
                          {isDeleting ? 'Deleting…' : 'Delete graph?'}
                        </span>
                        {!isDeleting && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, inquiry.id)}
                              className="rounded px-2 py-0.5 font-mono text-xs font-bold bg-trap text-fg hover:bg-trap/80 transition cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="rounded px-2 py-0.5 font-mono text-xs text-fg-muted hover:text-fg transition cursor-pointer"
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
                          className="rounded-lg p-2 text-fg-muted hover:text-trap hover:bg-trap-wash transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}

                    <div className="flex items-center gap-2 pl-2 border-l border-line">
                      <span className="font-mono text-xs text-fg-muted group-hover:text-fg transition">
                        Open Graph
                      </span>
                      <ArrowRight className="w-4 h-4 text-fg-muted group-hover:text-fg group-hover:translate-x-1 transition-transform" />
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
