import type { ReactNode } from 'react';

const TONES = {
  neutral: 'border-line-strong bg-surface-2/5 text-fg/60',
  accent: 'border-gold/30 bg-gold/10 text-gold',
  danger: 'border-trap/30 bg-trap/10 text-trap',
  success: 'border-explored/30 bg-explored/10 text-explored',
} as const;

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
