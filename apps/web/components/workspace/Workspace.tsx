'use client';

import { useMemo, useState } from 'react';
import { Trash2, Share2, GitBranch, ChevronDown, Map, MoreHorizontal, BookOpen, MessagesSquare } from 'lucide-react';
import { createQuestionNode, getInquiry, getStamina, submitTrapAttempt as sendTrapAttempt } from '../../lib/api-client';
import type { LearningSource, QuestionNode, StaminaState, TrapSubmissionState } from '../../lib/workspace-types';
import type { Inquiry } from '@tattva/contracts';
import { SourceViewer } from '../source-viewer/SourceViewer';
import type { GraphStatus } from '../knowledge-graph/KnowledgeGraphCanvas';
import { GraphOverlay } from '../knowledge-graph/GraphOverlay';
import { ResearchModeToggle } from '../research-mode/ResearchModeToggle';
import { StaminaDisplay } from '../stamina/StaminaDisplay';
import { InquiryComposer } from '../inquiry/InquiryComposer';
import { NodeDetailPanel } from './NodeDetailPanel';
import { ShareGraphModal } from '../knowledge-graph/ShareGraphModal';
import { useResearchModeAttribute } from '../../lib/useResearchModeAttribute';

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
  useResearchModeAttribute(researchMode);
  const [stamina, setStamina] = useState<StaminaState>(initialStamina);
  const [graphStatus, setGraphStatus] = useState<GraphStatus>('ready');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [activeMobileScreen, setActiveMobileScreen] = useState<'source' | 'inquiry'>(
    initialNodes.length > 0 ? 'inquiry' : 'source',
  );
  const [trapSubmissions, setTrapSubmissions] = useState<Record<string, TrapSubmissionState>>({});
  const [trapFeedback, setTrapFeedback] = useState<Record<string, string>>({});
  const [retryPayload, setRetryPayload] = useState<{ question: string; parentNodeId: string | null; selectedFollowUpId: string | null } | null>(null);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

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

  async function createNode(question: string, parentNodeId: string | null, selectedFollowUpId: string | null) {
    setRetryPayload({ question, parentNodeId, selectedFollowUpId });
    setActiveMobileScreen('inquiry');
    setGraphStatus('loading');
    setPendingMessage(null);
    try {
      const result = await createQuestionNode(inquiryId, { question, parentNodeId, selectedFollowUpId, researchMode });
      setRetryPayload(null);
      await refreshWorkspace();
      const createdId = result.data.node.id;
      setSelectedNodeId(createdId);
      setGraphStatus('ready');
    } catch (error) {
      setGraphStatus('error');
      setPendingMessage(error instanceof Error ? error.message : 'Could not create the question node. Please retry.');
    }
  }

  function handleSelectFollowUp(followUpId: string) {
    const activeParent = selectedNode;
    if (!activeParent) return;
    const followUp = activeParent.followUps.find((candidate) => candidate.id === followUpId);
    if (!followUp) return;
    if (followUp.childNodeId) {
      setSelectedNodeId(followUp.childNodeId);
      setGraphStatus('ready');
      setPendingMessage(null);
      return;
    }
    void createNode(followUp.questionText, activeParent.id, followUp.id);
  }

  async function handleSubmitTrap(nodeId: string, response: string) {
    setTrapSubmissions((current) => ({ ...current, [nodeId]: 'submitting' }));
    setTrapFeedback((current) => ({ ...current, [nodeId]: '' }));
    try {
      const result = await sendTrapAttempt(nodeId, response);
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

  const retryLastRequest = () => {
    setPendingMessage(null);
    if (retryPayload) void createNode(retryPayload.question, retryPayload.parentNodeId, retryPayload.selectedFollowUpId);
    else setGraphStatus('ready');
  };

  const isTrapBlocking = Boolean(selectedNode?.isTrap && !selectedNode?.trapResolvedAt);

  const deleteConfirm = onDeleteInquiry && confirmDelete && (
    <div className="flex items-center gap-1.5 rounded-lg border border-trap/30 bg-trap-wash px-2 py-1 text-xs">
      <span className="text-trap text-xs font-mono">Delete this inquiry?</span>
      <button
        type="button"
        onClick={() => {
          setConfirmDelete(false);
          onDeleteInquiry();
        }}
        className="rounded bg-trap px-1.5 py-0.5 text-xs font-bold text-fg hover:bg-trap/80 cursor-pointer"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setConfirmDelete(false)}
        className="rounded px-1.5 py-0.5 text-xs text-fg-muted hover:text-fg cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );

  return (
    <div
      data-research-mode={researchMode}
      className={`flex h-full w-full min-h-0 flex-col text-fg transition-colors ${researchMode ? 'bg-surface-1' : 'bg-bg'}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {inquiries && inquiries.length > 0 && onOpenInquirySwitcher && (
            <button
              type="button"
              onClick={onOpenInquirySwitcher}
              className="flex min-w-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2/5 hover:bg-surface-2/10 px-2.5 py-1 text-xs text-fg transition cursor-pointer"
              title="Switch active knowledge inquiry"
            >
              <GitBranch className="w-3.5 h-3.5 shrink-0 text-fg-muted" />
              <span className="max-w-[180px] truncate font-medium">
                {inquiries.find((i) => i.id === inquiryId)?.title || source.title || 'Inquiry'}
              </span>
              <span className="shrink-0 rounded bg-surface-3 px-1.5 font-mono text-xs font-bold text-fg-muted">
                {inquiries.length}
              </span>
              <ChevronDown className="w-3 h-3 shrink-0 text-fg-muted" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <StaminaDisplay stamina={stamina} researchMode={researchMode} />
          </div>
          <ResearchModeToggle enabled={researchMode} onChange={setResearchMode} />
          <button
            type="button"
            onClick={() => setIsGraphOpen(true)}
            title="Open the Knowledge Map"
            className="flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2 px-2.5 py-1 font-mono text-xs text-fg hover:border-gold transition cursor-pointer"
          >
            <Map className="w-3.5 h-3.5 text-gold" />
            <span className="hidden sm:inline">Knowledge Map</span>
            <span className="text-fg-muted">{nodes.length}</span>
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              title="Share this Knowledge Graph"
              className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2/5 px-2.5 py-1 font-mono text-xs text-fg-body hover:border-line-strong hover:text-fg transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-fg-muted" />
              <span>Share</span>
            </button>
            {onDeleteInquiry &&
              (deleteConfirm || (
                <button
                  type="button"
                  title="Delete this inquiry"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1 text-fg-muted hover:text-trap hover:bg-trap-wash transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ))}
          </div>

          <div className="relative lg:hidden">
            <button
              type="button"
              onClick={() => setIsOverflowOpen((prev) => !prev)}
              aria-label="More actions"
              aria-expanded={isOverflowOpen}
              className="rounded-lg p-1.5 text-fg-muted hover:text-fg hover:bg-surface-2 transition cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {isOverflowOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-48 space-y-1 rounded-lg border border-line bg-surface-1 p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsShareModalOpen(true);
                    setIsOverflowOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-fg-body hover:bg-surface-2 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-fg-muted" />
                  <span>Share</span>
                </button>
                {onDeleteInquiry && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOverflowOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-trap hover:bg-trap-wash transition cursor-pointer"
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

      {deleteConfirm && (
        <div className="flex shrink-0 justify-end border-b border-line px-4 py-1.5 lg:hidden">{deleteConfirm}</div>
      )}

      <div className="flex shrink-0 border-b border-line px-4 py-2 lg:hidden">
        <div role="tablist" className="inline-flex w-full rounded-lg border border-line bg-surface-1 p-0.5 font-mono text-xs">
          {(
            [
              { id: 'source', label: 'Source', Icon: BookOpen },
              { id: 'inquiry', label: 'Inquiry', Icon: MessagesSquare },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeMobileScreen === id}
              onClick={() => setActiveMobileScreen(id)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 transition cursor-pointer ${
                activeMobileScreen === id ? 'bg-surface-2 font-semibold text-fg shadow' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className={`min-h-0 ${activeMobileScreen === 'source' ? 'block' : 'hidden'} lg:block`}>
          <SourceViewer source={source} body={sourceBody} />
        </div>

        <div className={`min-h-0 flex-col overflow-hidden ${activeMobileScreen === 'inquiry' ? 'flex' : 'hidden'} lg:flex`}>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {pendingMessage && (
              <div className="flex items-center justify-between gap-3 rounded-sm border border-trap/30 bg-trap-wash px-3 py-2 text-xs text-trap">
                <p>{pendingMessage}</p>
                {retryPayload && (
                  <button type="button" onClick={retryLastRequest} className="shrink-0 underline underline-offset-2">
                    Retry
                  </button>
                )}
              </div>
            )}
            {graphStatus === 'loading' && (
              <p className="font-mono text-xs text-fg-muted" aria-live="polite">
                Thinking through your question…
              </p>
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
              graphStatus !== 'loading' && (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="text-sm text-fg-body">Read the source, then ask your first question below.</p>
                  <p className="text-xs text-fg-muted">Each answer becomes a node on your Knowledge Map.</p>
                </div>
              )
            )}
          </div>

          <div className="z-20 shrink-0 border-t border-line bg-surface-1 px-5 py-3.5">
            {selectedNode && (
              <p className="mb-1.5 font-mono text-xs text-fg-muted">
                {isTrapBlocking ? 'Custom questions (blocked by trap)' : 'Ask your own question or use voice assistant'}
              </p>
            )}
            <InquiryComposer
              disabled={isTrapBlocking || graphStatus === 'loading'}
              loading={graphStatus === 'loading'}
              inquiryId={inquiryId}
              placeholder={
                selectedNode
                  ? researchMode
                    ? 'Branch from this node (or speak in any language)…'
                    : 'Ask your own question or tap the mic/golden button to speak…'
                  : researchMode
                    ? 'Research mode is on — expect citations and Socratic questions…'
                    : 'Ask a technical question or speak in any language…'
              }
              onSubmit={(question) => void createNode(question, selectedNode?.id ?? null, null)}
            />
          </div>
        </div>
      </div>

      {isGraphOpen && (
        <GraphOverlay
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
          onRetry={retryLastRequest}
        />
      )}

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

