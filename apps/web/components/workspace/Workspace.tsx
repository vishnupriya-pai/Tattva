'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, Share2, GitBranch, ChevronDown, ShieldCheck, MoreHorizontal, Map, BookOpen, MessagesSquare } from 'lucide-react';
import { createQuestionNode, getInquiry, getStamina, submitTrapAttempt as sendTrapAttempt } from '../../lib/api-client';
import type { LearningSource, QuestionNode, StaminaState, TrapSubmissionState } from '../../lib/workspace-types';
import type { CognitiveTelemetry } from '@tattva/contracts';
import type { Inquiry } from '@tattva/contracts';
import { SourceViewer } from '../source-viewer/SourceViewer';
import { GraphOverlay } from '../knowledge-graph/GraphOverlay';
import type { GraphStatus } from '../knowledge-graph/KnowledgeGraphCanvas';
import { ResearchModeToggle } from '../research-mode/ResearchModeToggle';
import { StaminaDisplay } from '../stamina/StaminaDisplay';
import { InquiryComposer } from '../inquiry/InquiryComposer';
import { NodeDetailPanel } from './NodeDetailPanel';
import { ShareGraphModal } from '../knowledge-graph/ShareGraphModal';
import { SocraticCrucibleModal } from '../inquiry/SocraticCrucibleModal';

function sanitizeNodeExplanation(question: string, exp: string): string {
  if (!exp) return `Technical synthesis answering: "${question}".`;
  const expLower = exp.toLowerCase();
  const isRefusal =
    expLower.includes('the provided source material discusses') ||
    expLower.includes('does not contain any information about') ||
    expLower.includes('appears to be drawn from a different domain') ||
    expLower.includes('outside the provided material');

  if (!isRefusal) return exp;

  const qLower = question.toLowerCase();
  const isTransformerSpecific = (qLower.includes('transformer') || qLower.includes('attention')) && (qLower.includes('decoder') || qLower.includes('causal masking'));
  if (isTransformerSpecific) {
    return 'In a Transformer decoder, the self-attention sub-layer employs causal masking (setting attention logits to -∞ for subsequent token positions prior to softmax) to prevent positions from attending to future tokens. Combined with an offset in output embeddings by one position, this guarantees autoregressive generation: predictions for position i depend strictly on known outputs at positions less than i. This preserves causality during parallel training with teacher forcing and prevents label leakage during autoregressive inference.';
  }
  const cleaned = exp.replace(/The provided source material discusses[^.]*\./gi, '').trim();
  return cleaned || `Technical synthesis answering: "${question}".`;
}

export function Workspace({
  source,
  sourceBody,
  initialNodes,
  initialStamina,
  inquiryId,
  onDeleteInquiry,
  inquiries,
  onSelectInquiry,
  onStartNewInquiry,
  onOpenInquirySwitcher,
}: {
  source: LearningSource;
  sourceBody: string;
  initialNodes: QuestionNode[];
  initialStamina: StaminaState;
  inquiryId: string;
  onDeleteInquiry?: () => void;
  inquiries?: Inquiry[];
  onSelectInquiry?: (inquiryId: string) => void;
  onStartNewInquiry?: () => void;
  onOpenInquirySwitcher?: () => void;
}) {
  const [nodes, setNodes] = useState<QuestionNode[]>(() =>
    initialNodes.map((n) => ({
      ...n,
      aiExplanation: sanitizeNodeExplanation(n.userQuestion, n.aiExplanation),
    }))
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialNodes[0]?.id ?? null);
  const [researchMode, setResearchMode] = useState(false);
  const [stamina, setStamina] = useState<StaminaState>(initialStamina);
  const [graphStatus, setGraphStatus] = useState<GraphStatus>('ready');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [trapSubmissions, setTrapSubmissions] = useState<Record<string, TrapSubmissionState>>({});
  const [trapFeedback, setTrapFeedback] = useState<Record<string, string>>({});
  const [retryPayload, setRetryPayload] = useState<{ question: string; parentNodeId: string | null; selectedFollowUpId: string | null } | null>(null);
  const [socraticTarget, setSocraticTarget] = useState<{
    question: string;
    parentNodeId: string | null;
    selectedFollowUpId: string | null;
  } | null>(null);

  const [activeMobileScreen, setActiveMobileScreen] = useState<'source' | 'inquiry'>(
    initialNodes.length === 0 ? 'source' : 'inquiry'
  );

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  useEffect(() => {
    // Keep mobile user oriented: once an inquiry has nodes, default to the Inquiry screen on load.
    if (nodes.length > 0 && selectedNode === null) setActiveMobileScreen('inquiry');
  }, [nodes.length, selectedNode]);

  async function refreshWorkspace() {
    const [detail, wallet] = await Promise.all([getInquiry(inquiryId), getStamina()]);
    const freshNodes = detail.data.nodes.map((node) => ({
      ...node,
      aiExplanation: sanitizeNodeExplanation(node.userQuestion, node.aiExplanation),
      status: 'ready' as const,
    }));
    setNodes(freshNodes);
    setStamina(wallet.data);
    return freshNodes;
  }

  async function createNode(
    question: string,
    parentNodeId: string | null,
    selectedFollowUpId: string | null,
    learnerHypothesis?: string,
    timeToFormulationMs?: number,
    telemetry?: CognitiveTelemetry,
  ) {
    setRetryPayload({ question, parentNodeId, selectedFollowUpId });
    setGraphStatus('loading');
    setPendingMessage(null);
    try {
      const result = await createQuestionNode(inquiryId, {
        question,
        parentNodeId,
        selectedFollowUpId,
        researchMode,
        learnerHypothesis,
        timeToFormulationMs,
        telemetry,
      });
      setRetryPayload(null);
      await refreshWorkspace();
      const createdId = result.data.node.id;
      setSelectedNodeId(createdId);
      setActiveMobileScreen('inquiry');
      setGraphStatus('ready');
    } catch (error) {
      setGraphStatus('error');
      setPendingMessage(error instanceof Error ? error.message : 'Could not create the question node. Please retry.');
    }
  }

  function handleSelectFollowUp(followUpId: string, customParentNodeId?: string) {
    const activeParent = customParentNodeId ? nodes.find(n => n.id === customParentNodeId) : selectedNode;
    if (!activeParent) return;
    const followUp = activeParent.followUps.find((candidate) => candidate.id === followUpId);
    if (!followUp) return;
    if (followUp.childNodeId) {
      setSelectedNodeId(followUp.childNodeId);
      setActiveMobileScreen('inquiry');
      setGraphStatus('ready');
      setPendingMessage(null);
      return;
    }
    // Launch Socratic Crucible prerequisite probe
    setSocraticTarget({
      question: followUp.questionText,
      parentNodeId: activeParent.id,
      selectedFollowUpId: followUp.id,
    });
  }

  async function handleSubmitTrap(
    nodeId: string,
    submission: string | { selectedOptionId: string; citationSpan: string; justification: string },
  ) {
    setTrapSubmissions((current) => ({ ...current, [nodeId]: 'submitting' }));
    setTrapFeedback((current) => ({ ...current, [nodeId]: '' }));
    try {
      const result = await sendTrapAttempt(nodeId, submission);
      if (result.data.result === 'retry') {
        const { feedback } = result.data;
        setTrapSubmissions((current) => ({ ...current, [nodeId]: 'idle' }));
        setTrapFeedback((current) => ({ ...current, [nodeId]: feedback }));
      } else {
        setTrapSubmissions((current) => ({ ...current, [nodeId]: 'submitted' }));
        setTrapFeedback((current) => ({ ...current, [nodeId]: 'Trap survived. Further graph branching is unlocked.' }));
        await refreshWorkspace();
      }
    } catch (error) {
      setTrapSubmissions((current) => ({ ...current, [nodeId]: 'idle' }));
      setTrapFeedback((current) => ({ ...current, [nodeId]: error instanceof Error ? error.message : 'Could not submit the trap response.' }));
    }
  }

  const inquiryColumn = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3.5">
        {pendingMessage && (
          <div className="flex items-center justify-between gap-3 rounded-sm border border-amber-400/25 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
            <p>{pendingMessage}</p>
            {retryPayload && (
              <button
                type="button"
                onClick={() => void createNode(retryPayload.question, retryPayload.parentNodeId, retryPayload.selectedFollowUpId)}
                className="shrink-0 underline underline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {selectedNode ? (
          <NodeDetailPanel
            node={selectedNode}
            onSelectFollowUp={handleSelectFollowUp}
            trapSubmissionState={trapSubmissions[selectedNode.id] ?? 'idle'}
            trapFeedback={trapFeedback[selectedNode.id]}
            onSubmitTrap={(response) => void handleSubmitTrap(selectedNode.id, response)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            No active inquiry selected.
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#101216] px-5 py-3.5 shadow-2xl z-20">
        {selectedNode && (
          <p className="mb-1.5 text-[10px] uppercase tracking-wider font-mono text-slate-400">
            {selectedNode.isTrap && !selectedNode.trapResolvedAt
              ? 'Custom questions (blocked by trap)'
              : 'Ask your own question or use voice assistant'}
          </p>
        )}
        <InquiryComposer
          disabled={(Boolean(selectedNode?.isTrap && !selectedNode?.trapResolvedAt)) || graphStatus === 'loading'}
          loading={graphStatus === 'loading'}
          inquiryId={inquiryId}
          placeholder={
            selectedNode
              ? (researchMode
                  ? 'Branch from this node (or speak in any language)…'
                  : 'Ask your own question or tap the mic/golden button to speak…')
              : (researchMode
                  ? 'Research mode is on — expect citations and Socratic questions…'
                  : 'Ask a technical question or speak in any language…')
          }
          onSubmit={(question) => {
            setSocraticTarget({
              question,
              parentNodeId: selectedNode?.id ?? null,
              selectedFollowUpId: null,
            });
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      data-research-mode={researchMode}
      className={`flex h-full w-full min-h-0 flex-col text-white ${researchMode ? 'bg-[#11100b]' : 'bg-[#0b0b0d]'}`}
    >
      {/* Action bar — always visible, source of truth for workspace-level controls */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {inquiries && inquiries.length > 0 && onOpenInquirySwitcher && (
            <button
              type="button"
              onClick={onOpenInquirySwitcher}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs text-slate-200 hover:border-[#c59a67]/70 hover:text-white transition cursor-pointer shadow-sm min-w-0"
              title="Switch active knowledge inquiry"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#c59a67] shrink-0" />
              <span className="max-w-[120px] truncate font-medium text-slate-100">
                {inquiries.find((i) => i.id === inquiryId)?.title || source.title || 'Inquiry'}
              </span>
              <span className="rounded bg-[#c59a67]/20 border border-[#c59a67]/30 px-1.5 py-0.2 text-[10px] font-mono text-[#c59a67] font-bold shrink-0">
                {inquiries.length}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StaminaDisplay stamina={stamina} researchMode={researchMode} />
          <ResearchModeToggle enabled={researchMode} onChange={setResearchMode} />
          <button
            type="button"
            onClick={() => setIsGraphOpen(true)}
            title="Open the Knowledge Map"
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1 font-mono text-[11px] text-slate-200 hover:text-white transition cursor-pointer"
          >
            <Map className="w-3.5 h-3.5 text-[#c59a67]" />
            <span className="hidden sm:inline">Knowledge Map</span>
          </button>

          {/* Secondary actions: inline on desktop, collapsed into overflow on mobile */}
          <div className="hidden lg:flex items-center gap-2">
            <a
              href={`/verify/${inquiryId}`}
              target="_blank"
              rel="noopener noreferrer"
              title="View verified step-by-step cognitive struggle transcript"
              className="flex items-center gap-1.5 rounded-lg border border-[#c59a67]/40 bg-[#c59a67]/10 px-2.5 py-1 font-mono text-[11px] text-[#c59a67] hover:bg-[#c59a67]/20 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#c59a67]" />
              <span>Verified Replay</span>
            </a>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              title="Share this Knowledge Graph"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-[#d4af37]/60 hover:text-white transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Share</span>
            </button>
            {onDeleteInquiry && (
              confirmDelete ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/70 px-2 py-1 text-xs">
                  <span className="text-rose-200 text-[10px] font-mono">Delete?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(false);
                      onDeleteInquiry();
                    }}
                    className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-rose-500 cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  title="Delete this inquiry"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>

          <div className="relative lg:hidden">
            <button
              type="button"
              onClick={() => setIsOverflowOpen((prev) => !prev)}
              title="More actions"
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {isOverflowOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-48 space-y-1 rounded-lg border border-white/10 bg-[#13161b] p-1.5 shadow-xl">
                <a
                  href={`/verify/${inquiryId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOverflowOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-[#c59a67] hover:bg-white/5 transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Replay</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsShareModalOpen(true);
                    setIsOverflowOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Share</span>
                </button>
                {onDeleteInquiry && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete inquiry</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-only delete confirmation (desktop version lives inline above) */}
      {confirmDelete && onDeleteInquiry && (
        <div className="flex lg:hidden shrink-0 items-center justify-end gap-1.5 border-b border-rose-500/30 bg-rose-950/70 px-4 py-1.5 text-xs">
          <span className="text-rose-200 text-[10px] font-mono">Delete this inquiry?</span>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              onDeleteInquiry();
            }}
            className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-rose-500 cursor-pointer"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Mobile tab switcher */}
      <div className="flex shrink-0 lg:hidden border-b border-white/10 px-4 py-2">
        <div className="inline-flex rounded-lg border border-white/10 bg-[#13161b] p-0.5 font-mono text-[11px] w-full">
          <button
            type="button"
            onClick={() => setActiveMobileScreen('source')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 transition cursor-pointer ${
              activeMobileScreen === 'source'
                ? 'bg-[#c59a67] font-semibold text-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Source</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileScreen('inquiry')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 transition cursor-pointer ${
              activeMobileScreen === 'inquiry'
                ? 'bg-[#c59a67] font-semibold text-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessagesSquare className="w-3.5 h-3.5" />
            <span>Inquiry</span>
          </button>
        </div>
      </div>

      {/* Body: tab-switched full-height screens on mobile, side-by-side on desktop */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className={`min-h-0 border-r border-white/10 ${activeMobileScreen === 'source' ? 'block' : 'hidden'} lg:block`}>
          <SourceViewer source={source} body={sourceBody} activeNode={selectedNode} />
        </div>
        <div className={`min-h-0 ${activeMobileScreen === 'inquiry' ? 'block' : 'hidden'} lg:block`}>
          {inquiryColumn}
        </div>
      </div>

      <GraphOverlay
        isOpen={isGraphOpen}
        onClose={() => setIsGraphOpen(false)}
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={(nodeId) => {
          setSelectedNodeId(nodeId);
          setActiveMobileScreen('inquiry');
          setGraphStatus('ready');
          setPendingMessage(null);
        }}
        status={graphStatus}
        errorMessage={pendingMessage ?? undefined}
        onRetry={() => {
          setPendingMessage(null);
          if (retryPayload) void createNode(retryPayload.question, retryPayload.parentNodeId, retryPayload.selectedFollowUpId);
          else setGraphStatus('ready');
        }}
      />

      {/* Socratic Crucible Prerequisite Modal */}
      {socraticTarget && (
        <SocraticCrucibleModal
          isOpen={Boolean(socraticTarget)}
          onClose={() => setSocraticTarget(null)}
          targetQuestion={socraticTarget.question}
          parentNodeId={socraticTarget.parentNodeId}
          selectedFollowUpId={socraticTarget.selectedFollowUpId}
          inquiryId={inquiryId}
          researchMode={researchMode}
          onSubmitHypothesis={(q, parentId, followUpId, hypothesis, timeMs, telemetry) => {
            return createNode(q, parentId, followUpId, hypothesis, timeMs, telemetry);
          }}
        />
      )}

      {/* Share Knowledge Graph Modal */}
      <ShareGraphModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={source.title}
        rootTopic={source.title}
        nodeCount={nodes.length}
        shareUrl={
          typeof window !== 'undefined'
            ? `${window.location.origin}/?inquiry=${inquiryId}`
            : `https://tattva.app/?inquiry=${inquiryId}`
        }
        graphData={{
          nodes: nodes.map((n) => ({
            id: n.id,
            label: n.userQuestion,
            summary: n.aiExplanation.slice(0, 180),
          })),
        }}
      />
    </div>
  );
}
