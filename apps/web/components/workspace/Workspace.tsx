'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { createQuestionNode, getInquiry, getStamina, submitTrapAttempt as sendTrapAttempt } from '../../lib/api-client';
import type { LearningSource, QuestionNode, StaminaState, TrapSubmissionState } from '../../lib/workspace-types';
import { computeNodeMetrics } from '../../lib/graph-metrics';
import { SourceViewer } from '../source-viewer/SourceViewer';
import { KnowledgeGraphCanvas, type GraphStatus } from '../knowledge-graph/KnowledgeGraphCanvas';
import { ResearchModeToggle } from '../research-mode/ResearchModeToggle';
import { StaminaDisplay } from '../stamina/StaminaDisplay';
import { InquiryComposer } from '../inquiry/InquiryComposer';
import { Panel } from '../shared/Panel';
import { NodeDetailPanel } from './NodeDetailPanel';
import { NodeDetailModal } from './NodeDetailModal';

export function Workspace({
  source,
  sourceBody,
  initialNodes,
  initialStamina,
  inquiryId,
  onDeleteInquiry,
}: {
  source: LearningSource;
  sourceBody: string;
  initialNodes: QuestionNode[];
  initialStamina: StaminaState;
  inquiryId: string;
  onDeleteInquiry?: () => void;
}) {
  const [nodes, setNodes] = useState<QuestionNode[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialNodes[0]?.id ?? null);
  const [modalNodeId, setModalNodeId] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState(false);
  const [stamina, setStamina] = useState<StaminaState>(initialStamina);
  const [graphStatus, setGraphStatus] = useState<GraphStatus>('ready');
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [trapSubmissions, setTrapSubmissions] = useState<Record<string, TrapSubmissionState>>({});
  const [trapFeedback, setTrapFeedback] = useState<Record<string, string>>({});
  const [retryPayload, setRetryPayload] = useState<{ question: string; parentNodeId: string | null; selectedFollowUpId: string | null } | null>(null);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const modalNode = useMemo(() => nodes.find((node) => node.id === modalNodeId) ?? null, [nodes, modalNodeId]);
  const metricsMap = useMemo(() => computeNodeMetrics(nodes), [nodes]);

  async function refreshWorkspace() {
    const [detail, wallet] = await Promise.all([getInquiry(inquiryId), getStamina()]);
    const freshNodes = detail.data.nodes.map((node) => ({ ...node, status: 'ready' as const }));
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
    <div data-research-mode={researchMode} className={`grid h-screen grid-cols-1 grid-rows-2 text-white transition-colors lg:grid-cols-2 lg:grid-rows-1 ${researchMode ? 'bg-[#11100b]' : 'bg-[#0b0b0d]'}`}>
      <div className="min-h-0 border-b border-white/10 lg:border-b-0">
        <SourceViewer source={source} body={sourceBody} activeNode={selectedNode} />
      </div>

      <div className="flex h-full min-h-0 flex-col">
        <Panel
          title="Knowledge graph"
          actions={
            <div className="flex items-center gap-2">
              <StaminaDisplay stamina={stamina} researchMode={researchMode} />
              <ResearchModeToggle enabled={researchMode} onChange={setResearchMode} />
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

        <div className="max-h-[38%] shrink-0 space-y-4 overflow-y-auto border-t border-white/10 px-5 py-4">
          {pendingMessage && <div className="flex items-center justify-between gap-3 rounded-sm border border-amber-400/25 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
            <p>{pendingMessage}</p>
            {retryPayload && <button type="button" onClick={() => void createNode(retryPayload.question, retryPayload.parentNodeId, retryPayload.selectedFollowUpId)} className="shrink-0 underline underline-offset-2">Retry</button>}
          </div>}
          {selectedNode && <NodeDetailPanel
            node={selectedNode}
            onSelectFollowUp={handleSelectFollowUp}
            trapSubmissionState={trapSubmissions[selectedNode.id] ?? 'idle'}
            trapFeedback={trapFeedback[selectedNode.id]}
            onSubmitTrap={(response) => void handleSubmitTrap(selectedNode.id, response)}
          />}
          <div className={selectedNode ? 'border-t border-white/10 pt-3' : ''}>
            {selectedNode && (
              <p className="mb-2 text-[11px] uppercase tracking-wide text-white/40">
                {selectedNode.isTrap && !selectedNode.trapResolvedAt
                  ? 'Custom questions (blocked by trap)'
                  : 'Or ask your own question from this node'}
              </p>
            )}
            <InquiryComposer
              disabled={(Boolean(selectedNode?.isTrap && !selectedNode?.trapResolvedAt)) || graphStatus === 'loading'}
              loading={graphStatus === 'loading'}
              inquiryId={inquiryId}
              placeholder={
                selectedNode
                  ? (researchMode
                      ? 'Ask your own question to branch from this node (Research mode: citations & Socratic analysis)...'
                      : 'Ask your own follow-up question to branch from this node...')
                  : (researchMode
                      ? 'Research mode is on — expect citations and Socratic questions, not direct answers.'
                      : 'Ask a technical question about the source material...')
              }
              onSubmit={(question) => void createNode(question, selectedNode?.id ?? null, null)}
            />
          </div>
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
    </div>
  );
}
