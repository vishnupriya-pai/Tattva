'use client';

import React from 'react';

export type JournalTemplate = 'monograph' | 'transactions' | 'terminal' | 'memorandum' | 'springer';

interface TypographicJournalCoverProps {
  title: string;
  interlocutor: string;
  subject: string;
  durationMinutes: number;
  templateIndex?: number;
  intent?: 'First-Principles' | 'Research' | 'Postmortem' | 'Synthesis' | 'Foundations';
  codeIndex?: string;
}

/**
 * PRD §9: Standardized Visual Architecture
 * Tattva outright bans image uploads. Replaces clickbait thumbnails with
 * 5 strictly controlled, minimalist typographic journal covers.
 */
export const TypographicJournalCover: React.FC<TypographicJournalCoverProps> = ({
  title,
  interlocutor,
  subject,
  durationMinutes,
  templateIndex = 0,
  intent = 'First-Principles',
  codeIndex = '01',
}) => {
  const templates: JournalTemplate[] = [
    'monograph',
    'transactions',
    'terminal',
    'memorandum',
    'springer',
  ];
  const activeTemplate = templates[templateIndex % templates.length];

  // Template 1: University Press Monograph
  if (activeTemplate === 'monograph') {
    return (
      <div className="w-full aspect-video rounded-xl p-4 sm:p-5 flex flex-col justify-between border border-line bg-surface-1 relative overflow-hidden select-none group transition">
        {/* Subtle geometric background watermark */}
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full border border-line pointer-events-none" />
        <div className="absolute right-6 bottom-6 w-20 h-20 rounded-full border border-gold/10 pointer-events-none" />

        {/* Top Header: Volume Stamp & Floor Pass */}
        <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-fg-muted">
          <span className="text-gold uppercase font-bold">
            MONOGRAPH · {codeIndex}
          </span>
          <span className="rounded bg-gold/10 text-gold px-2 py-0.5 font-bold border border-gold/20">
            {durationMinutes} MIN · FLOOR PASS
          </span>
        </div>

        {/* Center: Editorial Serif Title */}
        <div className="my-auto py-2">
          <span className="block text-[9px] font-mono uppercase tracking-wider text-fg-muted mb-1">
            {subject}
          </span>
          <h3 className="font-serif-tattva text-base sm:text-lg text-fg font-normal leading-snug line-clamp-2 group-hover:text-gold transition">
            {title}
          </h3>
        </div>

        {/* Bottom: Interlocutor & Academic Intent */}
        <div className="pt-2 border-t border-line flex items-center justify-between text-[10px] font-mono text-fg-muted">
          <span className="truncate max-w-[65%]">{interlocutor}</span>
          <span className="text-fg-muted uppercase">{intent}</span>
        </div>
      </div>
    );
  }

  // Template 2: Technical Transactions (IEEE / ACM)
  if (activeTemplate === 'transactions') {
    return (
      <div className="w-full aspect-video rounded-xl p-4 sm:p-5 flex flex-col justify-between border border-line bg-surface-2 relative overflow-hidden select-none group transition">
        {/* Hairline Grid lines */}
        <div className="absolute top-0 right-12 bottom-0 w-[1px] bg-surface-2/5 pointer-events-none" />
        <div className="absolute top-10 left-0 right-0 h-[1px] bg-surface-2/5 pointer-events-none" />

        <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-fg-muted">
          <span className="text-gold font-bold uppercase">TRANSACTIONS § {codeIndex}</span>
          <span className="rounded bg-gold/10 text-gold px-2 py-0.5 font-bold border border-gold/20">
            {durationMinutes} MIN
          </span>
        </div>

        <div className="my-auto py-2">
          <div className="font-mono text-[9px] text-gold tracking-widest uppercase mb-1">
            {subject}
          </div>
          <h3 className="font-serif-tattva text-base sm:text-lg text-fg font-normal leading-snug line-clamp-2 group-hover:text-gold transition">
            {title}
          </h3>
        </div>

        <div className="pt-2 border-t border-line flex items-center justify-between text-[10px] font-mono text-fg-muted">
          <span className="truncate max-w-[65%]">INTERLOCUTOR: {interlocutor}</span>
          <span className="text-fg-muted uppercase">SYS-VERIFIED</span>
        </div>
      </div>
    );
  }

  // Template 3: UNIX Terminal Journal
  if (activeTemplate === 'terminal') {
    return (
      <div className="w-full aspect-video rounded-xl p-4 sm:p-5 flex flex-col justify-between border border-line bg-surface-1 relative overflow-hidden select-none group transition">
        <div className="flex items-center justify-between text-[10px] font-mono text-fg-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gold" />
            <span className="text-gold font-bold">TTY-{codeIndex}</span>
          </div>
          <span className="text-fg-muted font-bold font-mono">
            {durationMinutes}m 00s
          </span>
        </div>

        <div className="my-auto py-2 font-mono">
          <div className="text-[10px] text-fg-muted mb-1">
            $ cat /seeds/{subject.toLowerCase().replace(/[^a-z0-9]/g, '_')}.spec
          </div>
          <h3 className="text-sm sm:text-base font-bold text-fg leading-snug line-clamp-2 group-hover:text-gold transition">
            {title}
          </h3>
        </div>

        <div className="pt-2 border-t border-line flex items-center justify-between text-[10px] font-mono text-fg-muted">
          <span className="truncate max-w-[65%] text-fg-body">{interlocutor}</span>
          <span className="text-gold font-bold">[CRUCIBLE READY]</span>
        </div>
      </div>
    );
  }

  // Template 4: Bell Labs Memorandum
  if (activeTemplate === 'memorandum') {
    return (
      <div className="w-full aspect-video rounded-xl p-4 sm:p-5 flex flex-col justify-between border border-line bg-surface-2 relative overflow-hidden select-none group transition">
        <div className="flex items-center justify-between text-[10px] font-mono text-fg-muted">
          <span className="text-gold font-bold tracking-widest uppercase">
            MEMORANDUM · REF #{codeIndex}
          </span>
          <span className="rounded bg-gold/10 text-gold px-2 py-0.5 font-bold border border-gold/20">
            {durationMinutes} MIN
          </span>
        </div>

        <div className="my-auto py-2">
          <span className="inline-block text-[9px] font-mono tracking-wider text-fg-muted uppercase mb-1">
            {subject} · ARCHIVE
          </span>
          <h3 className="font-serif-tattva text-base sm:text-lg text-fg font-normal leading-snug line-clamp-2 group-hover:text-gold transition">
            {title}
          </h3>
        </div>

        <div className="pt-2 border-t border-line flex items-center justify-between text-[10px] font-mono text-fg-muted">
          <span className="truncate max-w-[65%]">PRIMARY: {interlocutor}</span>
          <span className="text-fg-muted uppercase">{intent}</span>
        </div>
      </div>
    );
  }

  // Template 5: Springer Lecture Notes
  return (
    <div className="w-full aspect-video rounded-xl p-4 sm:p-5 flex flex-col justify-between border border-line bg-surface-2 relative overflow-hidden select-none group transition">
      <div className="flex items-center justify-between text-[10px] font-mono text-fg-muted">
        <span className="text-gold font-bold uppercase tracking-wider">
          LNCS · VOL. {codeIndex}
        </span>
        <span className="rounded bg-gold/10 text-gold px-2 py-0.5 font-bold border border-gold/20">
          {durationMinutes} MIN
        </span>
      </div>

      <div className="my-auto py-2">
        <span className="block text-[9px] font-mono uppercase tracking-wider text-gold mb-1">
          {subject}
        </span>
        <h3 className="font-serif-tattva text-base sm:text-lg text-fg font-normal leading-snug line-clamp-2 group-hover:text-gold transition">
          {title}
        </h3>
      </div>

      <div className="pt-2 border-t border-line flex items-center justify-between text-[10px] font-mono text-fg-muted">
        <span className="truncate max-w-[65%]">{interlocutor}</span>
        <span className="text-fg-muted uppercase">PEER-REVIEWED</span>
      </div>
    </div>
  );
};
