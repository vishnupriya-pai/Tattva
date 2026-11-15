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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-xl max-h-[75vh] overflow-hidden rounded-2xl border border-white/15 bg-[#14161a] text-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#c59a67]/15 border border-[#c59a67]/30 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-[#c59a67]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Your Knowledge Inquiries
              </h2>
              <p className="text-[11px] font-mono text-slate-400">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#c59a67]/40 bg-[#c59a67]/10 hover:bg-[#c59a67]/20 px-3 py-1.5 text-xs font-mono font-bold text-[#c59a67] hover:text-white transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Inquiry</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inquiries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {inquiries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <p className="text-sm">No inquiries initiated yet.</p>
              <p className="text-xs text-slate-500">Launch your first inquiry to begin growing your Knowledge Graph.</p>
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
                      ? 'bg-[#c59a67]/15 border-[#c59a67]/50 text-white shadow-md'
                      : 'bg-white/[0.02] border-white/10 hover:border-[#c59a67]/50 hover:bg-white/[0.06] text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-100 truncate block">
                        {inq.title || 'Curated Technical Source'}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#c59a67] bg-[#c59a67]/20 border border-[#c59a67]/30 px-1.5 py-0.2 rounded font-bold shrink-0 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span>{formattedDate}</span>
                      <span>·</span>
                      <span className="truncate">ID: {inq.id.slice(0, 8)}…</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center text-xs font-mono text-slate-400 group-hover:text-white transition">
                    {isCurrent ? (
                      <span className="text-[#c59a67] text-xs">Viewing</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#c59a67] opacity-80 group-hover:opacity-100">
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
