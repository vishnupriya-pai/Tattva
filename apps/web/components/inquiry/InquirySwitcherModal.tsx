'use client';

import React, { useEffect } from 'react';
import { GitBranch, Plus, X, Check, ArrowRight } from 'lucide-react';
import type { Inquiry } from '@tattva/contracts';

export interface InquirySwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiries: Inquiry[];
  activeInquiryId: string | null;
  onSelectInquiry: (inquiryId: string) => void;
  onStartNewInquiry: () => void;
}

export const InquirySwitcherModal: React.FC<InquirySwitcherModalProps> = ({
  isOpen,
  onClose,
  inquiries,
  activeInquiryId,
  onSelectInquiry,
  onStartNewInquiry,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-bg/65 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[75vh] overflow-hidden rounded-2xl border border-line-strong bg-surface-1 text-fg shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-surface-2/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-surface-2 border border-line-strong flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-fg-muted" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-fg ">
                Your Knowledge Inquiries
              </h2>
              <p className="text-xs font-mono text-fg-muted">
                {inquiries.length} active knowledge graph{inquiries.length === 1 ? '' : 's'} available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartNewInquiry();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold hover:bg-gold-hover px-3 py-1.5 text-xs font-mono font-bold text-gold-ink transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Inquiry</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-fg/50 hover:bg-surface-2/10 hover:text-fg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inquiries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {inquiries.length === 0 ? (
            <div className="p-8 text-center text-fg-muted space-y-2">
              <p className="text-sm">No inquiries initiated yet.</p>
              <p className="text-xs text-fg-muted">Launch your first inquiry to begin growing your Knowledge Graph.</p>
            </div>
          ) : (
            inquiries.map((inq) => {
              const isCurrent = inq.id === activeInquiryId;
              const formattedDate = new Date(inq.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={inq.id}
                  onClick={() => {
                    onClose();
                    onSelectInquiry(inq.id);
                  }}
                  className={`group p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-surface-2 border-line-strong text-fg shadow-md'
                      : 'bg-surface-2/[0.02] border-line hover:border-line-strong hover:bg-surface-2/[0.06] text-fg-body hover:text-fg'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-fg truncate block">
                        {inq.title || 'Curated Technical Source'}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-mono text-fg bg-surface-3 px-1.5 py-0.2 rounded font-bold shrink-0 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-fg-muted">
                      <span>{formattedDate}</span>
                      <span>·</span>
                      <span className="truncate">ID: {inq.id.slice(0, 8)}…</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center text-xs font-mono text-fg-muted group-hover:text-fg transition">
                    {isCurrent ? (
                      <span className="text-fg text-xs">Viewing</span>
                    ) : (
                      <span className="flex items-center gap-1 text-fg-muted group-hover:text-fg">
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
