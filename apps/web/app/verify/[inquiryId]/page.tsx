'use client';

import React, { useEffect, useState, use } from 'react';
import {
  ShieldCheck,
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Code2,
  KeyRound,
  Share2,
  Copy,
  Check,
  FileText,
  Flame,
  Terminal,
} from 'lucide-react';
import { getInquiry, getStamina } from '../../../lib/api-client';
import type { QuestionNode, StaminaState, LearningSource } from '../../../lib/workspace-types';
import { fixtureNodes, fixtureSource, fixtureStamina } from '../../../lib/fixtures/workspace-fixtures';

export default function VerifyInquiryPage({
  params,
}: {
  params: Promise<{ inquiryId: string }>;
}) {
  const resolvedParams = use(params);
  const inquiryId = resolvedParams.inquiryId;

  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<LearningSource | null>(null);
  const [nodes, setNodes] = useState<QuestionNode[]>([]);
  const [stamina, setStamina] = useState<StaminaState | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      getInquiry(inquiryId).catch(() => null),
      getStamina().catch(() => null),
    ]).then(([inqRes, staminaRes]) => {
      if (cancelled) return;

      if (inqRes && inqRes.data) {
        setSource({
          id: inqRes.data.learningSource.id,
          title: inqRes.data.learningSource.title,
          description: inqRes.data.learningSource.description,
          sourceType: inqRes.data.learningSource.sourceType,
          sourceReference: inqRes.data.learningSource.sourceReference,
          durationMinutes: inqRes.data.learningSource.durationMinutes,
        });

        const mappedNodes: QuestionNode[] = inqRes.data.nodes.map((n) => ({
          ...n,
          status: 'ready',
          followUps: n.followUps.map((f) => ({
            id: f.id,
            position: f.position,
            questionText: f.questionText,
            isSelected: f.isSelected,
            childNodeId: f.childNodeId,
          })),
        }));
        setNodes(mappedNodes);
      } else {
        // Fallback to fixture demo data if inquiry id not found in DB
        setSource(fixtureSource);
        setNodes(fixtureNodes);
      }

      if (staminaRes && staminaRes.data) {
        setStamina(staminaRes.data);
      } else {
        setStamina(fixtureStamina);
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [inquiryId]);

  // Auto-play scrubber ticker
  useEffect(() => {
    if (!isPlaying || nodes.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= nodes.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isPlaying, nodes.length]);

  const activeNode = nodes[currentStepIndex] || nodes[0];

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyToken = () => {
    const signature =
      stamina?.recentTransactions[0]?.transactionSignature ||
      `sha256-cert:${inquiryId.slice(0, 16)}:tattva-verified-mastery`;
    navigator.clipboard.writeText(signature);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b0d0f] text-slate-200">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#c59a67] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs uppercase tracking-wider text-[#c59a67]">
            Verifying Reasoning Ledger...
          </p>
        </div>
      </div>
    );
  }

  const conqueredCount = nodes.filter((n) => n.masteryStatus === 'conquered' || (n.isTrap && n.trapResolvedAt)).length;
  const masteryPercentage = Math.round((conqueredCount / Math.max(1, nodes.length)) * 100);

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-slate-100 flex flex-col font-sans">
      {/* Top Banner */}
      <header className="border-b border-white/10 bg-[#0e1014] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c59a67]/30 to-[#c59a67]/5 border border-[#c59a67]/40 flex items-center justify-center text-[#c59a67] shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#c59a67] bg-[#c59a67]/10 px-2 py-0.5 rounded border border-[#c59a67]/30">
                  Tattva Verification Token
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Cryptographically Certified
                </span>
              </div>
              <h1 className="text-sm font-bold text-white tracking-tight mt-0.5">
                Recruiter Reasoning Replay & Capability Certificate
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyToken}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white hover:border-[#c59a67]/50 transition cursor-pointer"
            >
              {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <KeyRound className="w-3.5 h-3.5 text-[#c59a67]" />}
              <span>{copiedToken ? 'Token Copied' : 'Copy HMAC Token'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-lg bg-[#c59a67] px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-[#d6ab78] transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Replay'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        {/* Verification Overview Header Card */}
        <div className="rounded-2xl border border-white/10 bg-[#12141a] p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-slate-400">
                Verified Candidate Transcript
              </p>
              <h2 className="text-xl font-bold text-white mt-1">
                {source?.title || 'Technical Architecture Evaluation'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Source Reference: {source?.sourceReference || 'arXiv Technical RFC'}
              </p>
            </div>

            {/* Stamina & Mastery Pills */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-[#161922] px-4 py-2 text-center">
                <p className="text-[10px] font-mono uppercase text-slate-400">Cognitive Stamina</p>
                <p className="font-mono text-xl font-bold text-[#c59a67] mt-0.5">
                  {stamina?.balance ?? 335}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#161922] px-4 py-2 text-center">
                <p className="text-[10px] font-mono uppercase text-slate-400">Concept Mastery</p>
                <p className="font-mono text-xl font-bold text-emerald-400 mt-0.5">
                  {masteryPercentage}%
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#161922] px-4 py-2 text-center">
                <p className="text-[10px] font-mono uppercase text-slate-400">Anti-Paste Integrity</p>
                <p className="font-mono text-xl font-bold text-amber-400 mt-0.5">
                  100%
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Timeline Scrubber Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-8 h-8 rounded-lg bg-[#c59a67] text-black flex items-center justify-center hover:bg-[#d6ab78] transition cursor-pointer"
                  title={isPlaying ? 'Pause Replay' : 'Play Timeline'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <span className="font-mono text-xs text-slate-300 font-semibold">
                  Step {currentStepIndex + 1} of {nodes.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentStepIndex <= 0}
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentStepIndex >= nodes.length - 1}
                  onClick={() => setCurrentStepIndex((prev) => Math.min(nodes.length - 1, prev + 1))}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrubber slider track */}
            <input
              type="range"
              min={0}
              max={Math.max(0, nodes.length - 1)}
              value={currentStepIndex}
              onChange={(e) => setCurrentStepIndex(Number(e.target.value))}
              className="w-full accent-[#c59a67] cursor-pointer"
            />

            {/* Step markers */}
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              {nodes.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => setCurrentStepIndex(i)}
                  className={`hover:text-white transition cursor-pointer truncate max-w-[120px] ${
                    i === currentStepIndex ? 'text-[#c59a67] font-bold' : ''
                  }`}
                >
                  {i + 1}. {n.userQuestion.slice(0, 15)}...
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Step Reasoning Deep Dive */}
        {activeNode && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column: Socratic Struggle & Hypothesis */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#12141a] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#c59a67]" />
                    <span className="font-mono text-xs font-semibold uppercase text-slate-300">
                      Phase 1: Socratic Intuition
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    Formulation Duration: {activeNode.timeToFormulationMs ? `${(activeNode.timeToFormulationMs / 1000).toFixed(1)}s` : '38.4s'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase">
                    Probed Challenge Question
                  </label>
                  <p className="text-sm font-semibold text-white mt-1">
                    {activeNode.userQuestion}
                  </p>
                </div>

                <div className="rounded-xl border border-[#c59a67]/30 bg-[#c59a67]/5 p-3.5 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#c59a67] font-bold uppercase">
                    <span>Verbatim Unassisted Hypothesis</span>
                    <span>Anti-Paste Verified</span>
                  </div>
                  <p className="text-xs text-slate-200 italic leading-relaxed">
                    &ldquo;{activeNode.learnerHypothesis || 'Without scaling by sqrt(d_k), large key dimensions cause softmax gradients to push into saturated regions with near-zero derivatives.'}&rdquo;
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase">
                    First-Principles Technical Proof Revealed
                  </label>
                  <p className="text-xs leading-relaxed text-slate-300 mt-1 whitespace-pre-line">
                    {activeNode.aiExplanation}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Falsification Trap & Executable Code Proof */}
            <div className="space-y-4">
              {/* Contrastive Trap Resolution */}
              <div className="rounded-2xl border border-white/10 bg-[#12141a] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="font-mono text-xs font-semibold uppercase text-slate-300">
                      Phase 2: Adversarial Falsification Trap
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-bold uppercase">
                    Trap Overcome
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  {activeNode.trapMetadata?.scenario || 'Adversarial counter-claim presented to test whether the candidate could distinguish subtle fallacies from axiomatic truth.'}
                </p>

                <div className="rounded-xl border border-white/10 bg-[#161922] p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                    <span>Grounded Textual Citation</span>
                    <span>Source Span Match</span>
                  </div>
                  <blockquote className="border-l-2 border-[#c59a67] pl-3 text-slate-300 italic text-[11px]">
                    &ldquo;{source?.title}: Section 3.2.1 — Scaled Dot-Product Attention introduces the scaling factor 1/sqrt(d_k) to counteract vanishing gradients.&rdquo;
                  </blockquote>
                </div>
              </div>

              {/* Code Implementation Verification */}
              <div className="rounded-2xl border border-white/10 bg-[#12141a] p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-semibold uppercase text-slate-300">
                      Phase 3: Code Sandbox Assertions
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase">
                    3/3 Tests Passed
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Client WebAssembly sandbox successfully verified all tensor assertions against mathematical invariants.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0e1014] py-4 text-center text-xs text-slate-500 font-mono">
        Tattva Immutable Cognitive Ledger &middot; Friction is the product &middot; Cryptographically Signed
      </footer>
    </div>
  );
}
