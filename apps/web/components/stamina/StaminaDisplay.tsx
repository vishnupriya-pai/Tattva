'use client';

import React, { useState } from 'react';
import type { StaminaState, StaminaTransaction } from '../../lib/workspace-types';
import { Badge } from '../shared/Badge';
import {
  ShieldCheck,
  Flame,
  Zap,
  Clock,
  Keyboard,
  KeyRound,
  X,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

const EVENT_LABEL: Record<string, string> = {
  inquiry_started: 'Inquiry Root Initialized',
  session_started: 'First-Principles Hypothesis',
  followup_selected: 'Socratic Hypothesis Formulated',
  hypothesis_formulated: 'Cognitive Crucible Formulated',
  trap_survived: 'Contrastive Trap Falsified',
  inquiry_conquered: 'Knowledge Graph Conquered',
  node_completed_research_mode: 'Research Mode Breakthrough',
};

export function StaminaDisplay({
  stamina,
  researchMode,
}: {
  stamina: StaminaState;
  researchMode: boolean;
}) {
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<StaminaTransaction | null>(null);

  const latest = stamina.recentTransactions[0];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedTx(latest ?? null);
          setIsAuditOpen(true);
        }}
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:border-[#c59a67]/50 hover:bg-white/10 transition cursor-pointer text-left group"
        title="View Proof-of-Struggle Cognitive Ledger"
      >
        <div className="w-7 h-7 rounded-lg bg-[#c59a67]/15 border border-[#c59a67]/30 flex items-center justify-center text-[#c59a67] group-hover:scale-105 transition">
          <Zap className="w-3.5 h-3.5" />
        </div>

        <div className="text-right leading-none">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#c59a67] font-semibold">Stamina</p>
          <p className="font-mono text-base font-bold text-white tracking-tight">{stamina.balance}</p>
        </div>

        {stamina.streakDays > 1 && (
          <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>{stamina.streakDays}d</span>
          </div>
        )}

        {researchMode && <Badge tone="accent">2.5× Research</Badge>}

        {latest && (
          <span className="hidden text-[11px] text-slate-400 lg:inline max-w-[140px] truncate">
            +{latest.finalPoints} &middot; {EVENT_LABEL[latest.eventType] ?? latest.eventType}
          </span>
        )}
      </button>

      {/* Proof-of-Struggle Audit Modal */}
      {isAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#c59a67]/40 bg-[#0e1014] p-6 shadow-2xl shadow-black/90 text-slate-200 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#c59a67]/20 border border-[#c59a67]/40 flex items-center justify-center text-[#c59a67]">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#c59a67] bg-[#c59a67]/10 px-2 py-0.5 rounded border border-[#c59a67]/30">
                      Proof-of-Struggle
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">HMAC-SHA256 Certified</span>
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Cognitive Stamina Ledger
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAuditOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview Banner */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#14171d] p-3.5 text-center">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Minted</p>
                <p className="font-mono text-2xl font-bold text-[#c59a67] mt-0.5">{stamina.balance}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#14171d] p-3.5 text-center">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Streak</p>
                <p className="font-mono text-2xl font-bold text-amber-400 mt-0.5">{stamina.streakDays} Days</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#14171d] p-3.5 text-center">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Friction Multiplier</p>
                <p className="font-mono text-2xl font-bold text-emerald-400 mt-0.5">
                  {researchMode ? '2.5× Max' : '2.0× Max'}
                </p>
              </div>
            </div>

            {/* Transaction Ledger List */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                Recent Cognitive Verification Batches
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {stamina.recentTransactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                    No cognitive effort ledgered yet. Formulate a hypothesis to mint stamina.
                  </div>
                ) : (
                  stamina.recentTransactions.map((tx) => {
                    const isSelected = selectedTx?.id === tx.id;
                    const meta = tx.proofOfStruggleMetadata;

                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className={`rounded-xl border p-3 transition cursor-pointer ${
                          isSelected
                            ? 'border-[#c59a67]/60 bg-[#c59a67]/10'
                            : 'border-white/10 bg-[#14171d] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-400">
                              +{tx.finalPoints}
                            </span>
                            <span className="text-xs font-medium text-slate-200">
                              {EVENT_LABEL[tx.eventType] ?? tx.eventType}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Breakdown pills if available */}
                        {meta && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 border-t border-white/5 pt-2">
                            <span>Base: {meta.basePoints}</span>
                            <span>&middot;</span>
                            <span>M_trap: {meta.trapMultiplier}×</span>
                            <span>&middot;</span>
                            <span>M_revision: {meta.revisionMultiplier}×</span>
                            <span>&middot;</span>
                            <span>M_telemetry: {meta.telemetryMultiplier}×</span>
                            {meta.formulationMs ? (
                              <>
                                <span>&middot;</span>
                                <span className="flex items-center gap-1 text-slate-300">
                                  <Clock className="w-2.5 h-2.5" />
                                  {(meta.formulationMs / 1000).toFixed(1)}s
                                </span>
                              </>
                            ) : null}
                          </div>
                        )}

                        {/* Cryptographic Signature line */}
                        {tx.transactionSignature && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-mono text-slate-500 truncate">
                            <KeyRound className="w-2.5 h-2.5 text-[#c59a67] shrink-0" />
                            <span className="truncate">HMAC: {tx.transactionSignature}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer note */}
            <div className="border-t border-white/10 pt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono">Friction is the product &middot; Anti-paste verified</span>
              <button
                type="button"
                onClick={() => setIsAuditOpen(false)}
                className="rounded-lg bg-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/20 transition cursor-pointer text-xs"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
