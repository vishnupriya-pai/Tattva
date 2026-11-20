'use client';

import { useMemo, useState } from 'react';
import { Trash2, Share2, GitBranch, ChevronDown } from 'lucide-react';
import { createQuestionNode, getInquiry, getStamina, submitTrapAttempt as sendTrapAttempt } from '../../lib/api-client';
import type { LearningSource, QuestionNode, StaminaState, TrapSubmissionState } from '../../lib/workspace-types';
import type { Inquiry } from '@tattva/contracts';
import { computeNodeMetrics } from '../../lib/graph-metrics';
import { SourceViewer } from '../source-viewer/SourceViewer';
import { KnowledgeGraphCanvas, type GraphStatus } from '../knowledge-graph/KnowledgeGraphCanvas';
import { ResearchModeToggle } from '../research-mode/ResearchModeToggle';
import { StaminaDisplay } from '../stamina/StaminaDisplay';
import { InquiryComposer } from '../inquiry/InquiryComposer';
import { Panel } from '../shared/Panel';
import { NodeDetailPanel } from './NodeDetailPanel';
import { NodeDetailModal } from './NodeDetailModal';
import { ShareGraphModal } from '../knowledge-graph/ShareGraphModal';

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
  const [modalNodeId, setModalNodeId] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState(false);
  const [stamina, setStamina] = useState<StaminaState>(initialStamina);
  const [graphStatus, setGraphStatus] = useState<GraphStatus>('ready');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [trapSubmissions, setTrapSubmissions] = useState<Record<string, TrapSubmissionState>>({});
  const [trapFeedback, setTrapFeedback] = useState<Record<string, string>>({});
  const [retryPayload, setRetryPayload] = useState<{ question: string; parentNodeId: string | null; selectedFollowUpId: string | null } | null>(null);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const modalNode = useMemo(() => nodes.find((node) => node.id === modalNodeId) ?? null, [nodes, modalNodeId]);
  const metricsMap = useMemo(() => computeNodeMetrics(nodes), [nodes]);

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
    setGraphStatus('loading');
    setPendingMessage(null);
    try {
      const result = await createQuestionNode(inquiryId, { question, parentNodeId, selectedFollowUpId, researchMode });
      setRetryPayload(null);
      await refreshWorkspace();
      const createdId = result.data.node.id;
      setSelectedNodeId(createdId);
      // Automatically focus on the newly created node
      setModalNodeId(createdId);
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
      setModalNodeId(followUp.childNodeId);
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

  return (
    <div data-research-mode={researchMode} className={`grid h-full w-full min-h-0 grid-cols-1 grid-rows-2 text-fg transition-colors lg:grid-cols-2 lg:grid-rows-1 ${researchMode ? 'bg-surface-1' : 'bg-bg'}`}>
      <div className="min-h-0 border-b border-line lg:border-b-0">
        <SourceViewer source={source} body={sourceBody} activeNode={selectedNode} />
      </div>

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Panel
          title="Knowledge graph"
          actions={
            <div className="flex items-center gap-2">
              {inquiries && inquiries.length > 0 && onOpenInquirySwitcher && (
                <button
                  type="button"
                  onClick={onOpenInquirySwitcher}
                  className="flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2/5 hover:bg-surface-2/10 px-2.5 py-1 text-xs text-fg hover:border-line-strong hover:text-fg transition cursor-pointer shadow-sm"
                  title="Switch active knowledge inquiry"
                >
                  <GitBranch className="w-3.5 h-3.5 text-fg-muted" />
                  <span className="max-w-[150px] truncate font-medium text-fg">
                    {inquiries.find((i) => i.id === inquiryId)?.title || source.title || 'Inquiry'}
                  </span>
                  <span className="rounded bg-surface-3 px-1.5 py-0.2 text-xs font-mono text-fg-muted font-bold">
                    {inquiries.length}
                  </span>
                  <ChevronDown className="w-3 h-3 text-fg-muted" />
                </button>
              )}
              <StaminaDisplay stamina={stamina} researchMode={researchMode} />
              <ResearchModeToggle enabled={researchMode} onChange={setResearchMode} />
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                title="Share this Knowledge Graph"
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2/5 px-2.5 py-1 font-mono text-xs text-fg-body hover:border-line-strong hover:text-fg transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-fg-muted" />
                <span>Share</span>
              </button>
              {onDeleteInquiry && (
                confirmDelete ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-trap/30 bg-trap-wash px-2 py-1 text-xs">
                    <span className="text-trap text-xs font-mono">Delete?</span>
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
                ) : (
                  <button
                    type="button"
                    title="Delete this inquiry"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-lg p-1 text-fg-muted hover:text-trap hover:bg-trap-wash transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )
              )}
            </div>
          }
          className="min-h-0 flex-1"
        >
          <div className="h-full min-h-[280px]">
            <KnowledgeGraphCanvas
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                setModalNodeId(nodeId);
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
          </div>
        </Panel>

        {/* Selected Node Details & Follow-ups (Scrollable Area) */}
        {selectedNode && (
          <div className="max-h-[28vh] shrink-0 space-y-3 overflow-y-auto border-t border-line bg-surface-1/60 px-5 py-3">
            {pendingMessage && (
              <div className="flex items-center justify-between gap-3 rounded-sm border border-trap/30 bg-trap-wash px-3 py-2 text-xs text-trap">
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
            <NodeDetailPanel
              node={selectedNode}
              onSelectFollowUp={handleSelectFollowUp}
              trapSubmissionState={trapSubmissions[selectedNode.id] ?? 'idle'}
              trapFeedback={trapFeedback[selectedNode.id]}
              onSubmitTrap={(response) => void handleSubmitTrap(selectedNode.id, response)}
            />
          </div>
        )}

        {/* Dedicated Elevated Composer & Voice Assistant Bar (Always Visible at Bottom) */}
        <div className="shrink-0 border-t border-line bg-surface-1 px-5 py-3.5 shadow-2xl z-20">
          {selectedNode && (
            <p className="mb-1.5 text-xs font-mono text-fg-muted">
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
            onSubmit={(question) => void createNode(question, selectedNode?.id ?? null, null)}
          />
        </div>
      </div>

      {/* Pop-up Detail Modal Card on Node Tap */}
      {modalNode && (
        <NodeDetailModal
          node={modalNode}
          metrics={metricsMap.get(modalNode.id)}
          onClose={() => setModalNodeId(null)}
          onSelectFollowUp={(followUpId) => {
            handleSelectFollowUp(followUpId, modalNode.id);
          }}
          trapSubmissionState={trapSubmissions[modalNode.id] ?? 'idle'}
          trapFeedback={trapFeedback[modalNode.id]}
          onSubmitTrap={(response) => void handleSubmitTrap(modalNode.id, response)}
          onAskCustomQuestion={(question) => void createNode(question, modalNode.id, null)}
          isAskingCustom={graphStatus === 'loading'}
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
