'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  Play,
  RotateCcw,
  ExternalLink,
  Plus,
  X,
  Layers,
  Award,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Sparkles,
  GitBranch,
  Share2,
} from 'lucide-react';
import type { StudySource, SourceNote } from '../../types/thinkforge';
import { InquiryComposer } from '../inquiry/InquiryComposer';
import { ShareGraphModal } from '../knowledge-graph/ShareGraphModal';

interface SourceWorkStudioProps {
  source: StudySource;
  onBack: () => void;
  onUpdateSource?: (updated: StudySource) => void;
  inquiryId?: string;
}

type StudioTab = 'transcript' | 'quizzes' | 'notes' | 'paper' | 'video';

export const SourceWorkStudio: React.FC<SourceWorkStudioProps> = ({
  source: initialSource,
  onBack,
  onUpdateSource,
  inquiryId,
}) => {
  const [source, setSource] = useState<StudySource>(initialSource);
  const [activeTab, setActiveTab] = useState<StudioTab>('transcript');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    source.knowledgeGraph.rootNodeId
  );
  const [graphZoom, setGraphZoom] = useState<number>(1);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<SourceNote['category']>('Custom Note');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [socraticInput, setSocraticInput] = useState('');
  const [researchMode, setResearchMode] = useState<boolean>(true);
  const [activeTrap, setActiveTrap] = useState<{
    scenario: string;
    resolution: string;
  } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Socratic Q&A and Voice Assistant Dialogue state
  const [dialogueHistory, setDialogueHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([]);
  const [isAnsweringQuestion, setIsAnsweringQuestion] = useState(false);

  // Selected node details
  const selectedNode = useMemo(() => {
    return (
      source.knowledgeGraph.nodes.find((n) => n.id === selectedNodeId) ||
      source.knowledgeGraph.nodes[0]
    );
  }, [source.knowledgeGraph.nodes, selectedNodeId]);

  // Quizzes belonging specifically to the currently selected node (4-5 quizzes)
  const nodeQuizzes = useMemo(() => {
    if (!selectedNode) return [];
    return source.quizzes.filter((q) => q.relatedConceptNodeId === selectedNode.id);
  }, [source.quizzes, selectedNode]);

  // Adaptive follow-ups tailored to the active node and source
  const nodeFollowUps = useMemo(() => {
    if (!selectedNode) return [];
    return [
      `How does ${selectedNode.label} maintain its core invariant under high contention?`,
      `What specific architectural failure occurs if ${selectedNode.label} is omitted?`,
      `Derive the formal mathematical proof or complexity trade-off for ${selectedNode.label}.`
    ];
  }, [selectedNode]);

  const handleAskInquiryQuestion = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setDialogueHistory((prev) => [...prev, { role: 'user', text: userPrompt, time: now }]);
    setIsAnsweringQuestion(true);

    setTimeout(() => {
      let responseText = '';
      const promptLower = userPrompt.toLowerCase();
      if (promptLower.includes('complexity') || promptLower.includes('time') || promptLower.includes('space') || promptLower.includes('o(')) {
        responseText = `In "${source.title}", the formal computational invariant for ${selectedNode?.label || 'this concept'} is bounded by ${selectedNode?.keyFormula || 'strictly linear amortized operations'}. Any non-orthogonal dependency violates the optimal lower bound.`;
      } else if (promptLower.includes('failure') || promptLower.includes('break') || promptLower.includes('violation') || promptLower.includes('bug')) {
        responseText = `Architectural Invariant Check: ${selectedNode?.failureMode || 'Violating the state invariants degrades system guarantees.'} As formalized in the research paper, preventing this requires strict enforcement of the primary invariant.`;
      } else {
        responseText = `Socratic Scaffolding [${selectedNode?.category || source.category}]: In ${selectedNode?.label || 'this concept'}, observe how ${selectedNode?.shortLine || 'the primary invariant'} guarantees consistency. What boundary condition would arise if the execution order were inverted? Notice that the mathematical proof requires complete atomic transitions.`;
      }

      setDialogueHistory((prev) => [
        ...prev,
        { role: 'assistant', text: responseText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      setIsAnsweringQuestion(false);
    }, 450);
  };

  // Dynamic calculation of topic mastery score
  const masteryStats = useMemo(() => {
    const totalNodes = source.knowledgeGraph.nodes.length;
    const masteredNodes = source.knowledgeGraph.nodes.filter((n) => n.status === 'mastered').length;
    const inProgressNodes = source.knowledgeGraph.nodes.filter((n) => n.status === 'in_progress').length;
    
    // Quiz score
    const totalQuizzes = source.quizzes.length;
    const passedQuizzes = source.quizzes.filter((q) => q.isAnsweredCorrectly).length;
    const quizScorePct = totalQuizzes > 0 ? (passedQuizzes / totalQuizzes) * 100 : 0;
    
    // Combined In-and-Out Mastery: 65% weight on graph concepts + 35% on active quizzes
    const nodeScorePct = totalNodes > 0 ? ((masteredNodes + inProgressNodes * 0.5) / totalNodes) * 100 : 0;
    const compositeScore = Math.round(nodeScorePct * 0.65 + quizScorePct * 0.35);

    let level: StudySource['masteryLevel'] = 'Beginner';
    if (compositeScore >= 90) level = 'Mastered';
    else if (compositeScore >= 75) level = 'Advanced';
    else if (compositeScore >= 60) level = 'Proficient';
    else if (compositeScore >= 40) level = 'Intermediate';

    return {
      totalNodes,
      masteredNodes,
      inProgressNodes,
      unexploredNodes: totalNodes - masteredNodes - inProgressNodes,
      totalQuizzes,
      passedQuizzes,
      compositeScore,
      level,
    };
  }, [source]);

  // Semantic Zoom Calculation:
  const semanticTier = useMemo<'macro' | 'standard' | 'micro'>(() => {
    if (graphZoom < 0.85) return 'macro';
    if (graphZoom <= 1.15) return 'standard';
    return 'micro';
  }, [graphZoom]);

  const visibleNodes = useMemo(() => {
    return source.knowledgeGraph.nodes.filter((node) => {
      const nodeTier = node.tier || (node.depth === 0 ? 'macro' : 'standard');
      if (semanticTier === 'macro') {
        return nodeTier === 'macro' || node.id === source.knowledgeGraph.rootNodeId;
      }
      if (semanticTier === 'standard') {
        return nodeTier === 'macro' || nodeTier === 'standard' || node.id === source.knowledgeGraph.rootNodeId;
      }
      return true; // Micro: show all leaf nodes
    });
  }, [source.knowledgeGraph.nodes, source.knowledgeGraph.rootNodeId, semanticTier]);

  const visibleNodeIdSet = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return source.knowledgeGraph.edges.filter((edge) => {
      if (!visibleNodeIdSet.has(edge.source) || !visibleNodeIdSet.has(edge.target)) return false;
      const edgeTier = edge.tier || 'standard';
      if (semanticTier === 'macro') {
        return edgeTier === 'macro';
      }
      if (semanticTier === 'standard') {
        return edgeTier === 'macro' || edgeTier === 'standard';
      }
      return true; // Micro: show dense crosslinks and sub-invariants
    });
  }, [source.knowledgeGraph.edges, visibleNodeIdSet, semanticTier]);

  const getCollapsedChildrenCount = (parentNodeId: string) => {
    const directChildren = source.knowledgeGraph.edges
      .filter((e) => e.source === parentNodeId)
      .map((e) => e.target);
    const hiddenChildren = directChildren.filter((childId) => !visibleNodeIdSet.has(childId));
    return hiddenChildren.length;
  };

  // Handle quiz answer selection
  const handleSelectQuizOption = (quizId: string, optionIndex: number) => {
    const updatedQuizzes = source.quizzes.map((q) => {
      if (q.id !== quizId) return q;
      const isCorrect = optionIndex === q.correctOptionIndex;
      return {
        ...q,
        userSelectedIndex: optionIndex,
        isAnsweredCorrectly: isCorrect,
      };
    });

    const targetQuiz = source.quizzes.find((q) => q.id === quizId);
    let updatedNodes = source.knowledgeGraph.nodes;
    if (targetQuiz && optionIndex === targetQuiz.correctOptionIndex) {
      updatedNodes = updatedNodes.map((node) => {
        if (node.id === targetQuiz.relatedConceptNodeId && node.status !== 'mastered') {
          return { ...node, status: 'mastered' };
        }
        return node;
      });
    }

    const updatedSource: StudySource = {
      ...source,
      quizzes: updatedQuizzes,
      knowledgeGraph: {
        ...source.knowledgeGraph,
        nodes: updatedNodes,
      },
    };

    setSource(updatedSource);
    onUpdateSource?.(updatedSource);
  };

  // Reset quiz
  const handleResetQuiz = () => {
    const updatedQuizzes = source.quizzes.map((q) => ({
      ...q,
      userSelectedIndex: null,
      isAnsweredCorrectly: false,
    }));
    const updatedSource = { ...source, quizzes: updatedQuizzes };
    setSource(updatedSource);
    onUpdateSource?.(updatedSource);
  };

  // Toggle graph node status
  const handleToggleNodeStatus = (nodeId: string) => {
    const updatedNodes = source.knowledgeGraph.nodes.map((n) => {
      if (n.id !== nodeId) return n;
      let nextStatus: 'mastered' | 'in_progress' | 'unexplored' = 'mastered';
      if (n.status === 'mastered') nextStatus = 'in_progress';
      else if (n.status === 'in_progress') nextStatus = 'unexplored';
      else nextStatus = 'mastered';
      return { ...n, status: nextStatus };
    });

    const updatedSource = {
      ...source,
      knowledgeGraph: {
        ...source.knowledgeGraph,
        nodes: updatedNodes,
      },
    };
    setSource(updatedSource);
    onUpdateSource?.(updatedSource);
  };

  // Add custom note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const newNote: SourceNote = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim(),
      category: newNoteCategory,
      content: newNoteContent.trim(),
      updatedAt: 'Just now',
    };

    const updatedSource = {
      ...source,
      notes: [newNote, ...source.notes],
    };

    setSource(updatedSource);
    onUpdateSource?.(updatedSource);
    setNewNoteTitle('');
    setNewNoteContent('');
    setIsAddingNote(false);
  };

  return (
    <div className="flex flex-col h-full bg-surface-1 text-fg">
      {/* Studio Header Bar */}
      <header className="border-b border-line bg-surface-1 px-6 py-3 shadow-md shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-body hover:text-fg hover:border-line-strong transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sources</span>
            </button>

            <div className="h-4 w-px bg-surface-2/10" />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-fg-muted bg-surface-2 px-2 py-0.5 rounded">
                  {source.category}
                </span>
                <span className="text-xs text-fg-muted">·</span>
                <span className="text-xs text-fg-muted font-mono">
                  {source.sourceTypeLabel}
                </span>
              </div>
              <h1 className="font-display text-base sm:text-lg font-normal text-fg mt-0.5 line-clamp-1">
                {source.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* PRD §7: Physical [Research Mode] Switch */}
            <button
              type="button"
              onClick={() => setResearchMode((prev) => !prev)}
              title="PRD §7: The Training Weights. Direct answers forbidden; awards 3x Cognitive Stamina."
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-xs font-bold transition cursor-pointer ${
                researchMode
                  ? 'border-gold/60 bg-gold/15 text-gold'
                  : 'border-line bg-surface-2 text-fg-muted hover:text-fg'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  researchMode ? 'bg-gold' : 'bg-surface-3'
                }`}
              />
              <span>Research mode: {researchMode ? 'Active (3×)' : 'Off'}</span>
            </button>

            {/* Mastery Indicator Box */}
            <div className="flex items-center gap-4 bg-surface-2 border border-line rounded-xl px-4 py-2 shadow-sm">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-mono text-fg-muted ">
                    Topic in-and-out mastery
                  </span>
                  <span className="font-mono text-xs font-bold text-fg">
                    {masteryStats.compositeScore}% · {masteryStats.level}
                  </span>
                </div>
                <div className="w-48 bg-surface-2/10 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      masteryStats.compositeScore >= 100 ? 'bg-gold' : 'bg-fg-body'
                    }`}
                    style={{ width: `${masteryStats.compositeScore}%` }}
                  />
                </div>
              </div>

              <div className="h-7 w-px bg-surface-2/10" />

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="text-center">
                  <div className="font-bold text-fg">{masteryStats.masteredNodes}</div>
                  <div className="text-xs text-fg-muted">Mastered</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-fg">{masteryStats.inProgressNodes}</div>
                  <div className="text-xs text-fg-muted">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-fg">
                    {masteryStats.passedQuizzes}/{masteryStats.totalQuizzes}
                  </div>
                  <div className="text-xs text-fg-muted">Quiz Passed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio: Dual-Screen Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT SCREEN: SOURCE MATERIAL (Mirroring Screenshot 2) */}
        <div className="lg:col-span-6 xl:col-span-6 border-r border-line flex flex-col bg-surface-1 overflow-hidden">
          {/* Sub-nav Tab Bar */}
          <div className="border-b border-line px-6 pt-2.5 flex items-center justify-between bg-surface-1">
            <nav className="flex space-x-2" aria-label="Sections">
              <button
                type="button"
                onClick={() => setActiveTab('transcript')}
                className={`py-2 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
                  activeTab === 'transcript'
                    ? 'border-fg text-fg'
                    : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                Source Transcript
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quizzes')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
                  activeTab === 'quizzes'
                    ? 'border-fg text-fg'
                    : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Active Quizzes</span>
                <span className="font-mono text-xs text-fg-faint px-1">
                  {masteryStats.passedQuizzes}/{masteryStats.totalQuizzes}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
                  activeTab === 'notes'
                    ? 'border-fg text-fg'
                    : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notes &amp; Formulas ({source.notes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paper')}
                className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
                  activeTab === 'paper'
                    ? 'border-fg text-fg'
                    : 'border-transparent text-fg-muted hover:text-fg'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Research Paper</span>
              </button>

              {source.youtubeId && (
                <button
                  type="button"
                  onClick={() => setActiveTab('video')}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
                    activeTab === 'video'
                      ? 'border-fg text-fg'
                      : 'border-transparent text-fg-muted hover:text-fg'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Lecture</span>
                </button>
              )}
            </nav>

            {activeTab === 'notes' && (
              <button
                type="button"
                onClick={() => setIsAddingNote(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold text-fg hover:border-line-strong transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            )}

            {activeTab === 'quizzes' && (
              <button
                type="button"
                onClick={handleResetQuiz}
                title="Retake all quizzes"
                className="inline-flex items-center gap-1 text-xs font-mono text-fg-muted hover:text-fg transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retake</span>
              </button>
            )}
          </div>

          {/* Left Screen Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB: TRANSCRIPT (Directly matches Screenshot 2) */}
            {activeTab === 'transcript' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-2xl sm:text-3xl text-fg font-normal leading-snug">
                    {source.title}
                  </h2>
                  <div className="mt-2 font-mono text-xs text-fg-muted flex items-center gap-4">
                    <span>Runtime {source.duration || '38 min'}</span>
                    <span>Reference seed/{source.id}.txt</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-fg-body leading-relaxed font-sans border-t border-line pt-4">
                  {source.transcript ? (
                    source.transcript.split('\n\n').map((paragraph, pIdx) => {
                      const trimmed = paragraph.trim();
                      if (!trimmed) return null;
                      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                        const items = trimmed.split('\n').filter(Boolean);
                        return (
                          <ul key={pIdx} className="list-disc pl-5 space-y-1.5 text-xs text-fg-body font-mono">
                            {items.map((it, itIdx) => (
                              <li key={itIdx}>{it.replace(/^[-•]\s*/, '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      if (
                        trimmed.includes('Attention(Q, K, V) =') ||
                        trimmed.includes('PE(pos,') ||
                        trimmed.includes('K = g^(ab)') ||
                        trimmed.includes('Σ * v_i =')
                      ) {
                        return (
                          <div key={pIdx} className="rounded-xl border border-line-strong bg-surface-1 p-3.5 font-mono text-xs text-fg">
                            {trimmed}
                          </div>
                        );
                      }
                      return (
                        <p key={pIdx} className="leading-relaxed">
                          {trimmed}
                        </p>
                      );
                    })
                  ) : (
                    <p className="leading-relaxed">{source.summary}</p>
                  )}

                  <div className="rounded-xl border border-line bg-surface-2 p-4 space-y-2 mt-4">
                    <div className="font-mono text-xs text-fg-muted font-bold ">
                      Architectural Mechanics &amp; Invariants:
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-xs text-fg-body">
                      <li>Domain: {source.category} &bull; {source.sourceTypeLabel}</li>
                      <li>In-and-Out Mastery Benchmark: {masteryStats.compositeScore}% ({masteryStats.level})</li>
                      <li>Verified Concept Nodes: {masteryStats.masteredNodes} / {masteryStats.totalNodes} Mastered</li>
                      <li>Interactive Quizzes: {masteryStats.passedQuizzes} / {masteryStats.totalQuizzes} Passed</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ACTIVE QUIZZES */}
            {activeTab === 'quizzes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-surface-2 border border-line rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line text-fg-muted flex items-center justify-center font-bold">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-fg">
                        Concept Mastery Quizzes ({source.quizzes.length})
                      </h3>
                      <p className="text-xs text-fg-muted">
                        Answer to test your in-and-out understanding and advance graph verification.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl font-bold text-fg">
                      {Math.round((masteryStats.passedQuizzes / (source.quizzes.length || 1)) * 100)}%
                    </span>
                    <span className="block text-xs text-fg-muted font-mono ">Accuracy</span>
                  </div>
                </div>

                <div className="space-y-5">
                  {source.quizzes.map((quiz, qIdx) => {
                    const isAnswered = quiz.userSelectedIndex !== null && quiz.userSelectedIndex !== undefined;
                    return (
                      <div
                        key={quiz.id}
                        className="rounded-2xl border border-line bg-surface-2 p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="w-6 h-6 rounded-full bg-surface-2/10 text-fg font-mono text-xs font-bold flex items-center justify-center">
                            Q{qIdx + 1}
                          </span>
                          <span className="text-xs font-mono text-fg-muted">
                            Concept: {source.knowledgeGraph.nodes.find(n => n.id === quiz.relatedConceptNodeId)?.label || 'Core Invariant'}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-fg leading-snug">
                          {quiz.question}
                        </h4>

                        {/* Options */}
                        <div className="mt-4 space-y-2">
                          {quiz.options.map((option, optIdx) => {
                            const isSelected = quiz.userSelectedIndex === optIdx;
                            const isCorrectOpt = optIdx === quiz.correctOptionIndex;

                            let optClasses =
                              'border border-line bg-surface-2 hover:border-line-strong text-fg-body';

                            if (isAnswered) {
                              if (isCorrectOpt) {
                                optClasses = 'border-explored bg-explored/10 text-fg font-semibold';
                              } else if (isSelected && !isCorrectOpt) {
                                optClasses = 'border-trap/80 bg-trap/20 text-trap';
                              } else {
                                optClasses = 'border-line bg-surface-1 text-fg-muted opacity-60';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={isAnswered}
                                onClick={() => handleSelectQuizOption(quiz.id, optIdx)}
                                className={`w-full text-left rounded-xl p-3 text-xs leading-relaxed transition flex items-start gap-3 cursor-pointer ${optClasses}`}
                              >
                                <span className="font-mono font-bold text-xs mt-0.5 text-fg-muted">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span className="flex-1">{option}</span>
                                {isAnswered && isCorrectOpt && (
                                  <CheckCircle2 className="w-4 h-4 text-explored shrink-0 mt-0.5" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation banner */}
                        {isAnswered && (
                          <div className="rounded-xl border border-line bg-surface-1 p-3 text-xs text-fg-body leading-relaxed">
                            <span
                              className={`font-bold block mb-1 ${
                                quiz.isAnsweredCorrectly ? 'text-explored' : 'text-trap'
                              }`}
                            >
                              {quiz.isAnsweredCorrectly ? '✓ Correct Explanation:' : '⚠ Concept Breakdown:'}
                            </span>
                            {quiz.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: NOTES & FORMULAS */}
            {activeTab === 'notes' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-fg-muted">
                    {source.notes.length} Recorded Architectural Notes
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface-2 px-3 py-1 font-mono text-xs font-semibold text-fg hover:bg-surface-3 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Note
                  </button>
                </div>

                {isAddingNote && (
                  <form
                    onSubmit={handleAddNote}
                    className="rounded-2xl border border-line-strong bg-surface-2 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-fg-muted ">
                        Add Note or Formula
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingNote(false)}
                        className="text-fg-muted hover:text-fg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Note Title / Invariant"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface-1 px-3 py-2 text-xs text-fg placeholder-fg-faint outline-none focus:border-gold"
                      required
                    />
                    <select
                      value={newNoteCategory}
                      onChange={(e) => setNewNoteCategory(e.target.value as SourceNote['category'])}
                      className="w-full rounded-xl border border-line bg-surface-1 px-3 py-2 text-xs text-fg outline-none focus:border-gold"
                    >
                      <option value="Custom Note">Custom Note</option>
                      <option value="Key Invariant">Key Invariant</option>
                      <option value="Formula">Formula</option>
                      <option value="Implementation">Implementation</option>
                    </select>
                    <textarea
                      placeholder="Content / Formula markdown..."
                      rows={3}
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface-1 px-3 py-2 text-xs text-fg placeholder-fg-faint outline-none focus:border-gold"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingNote(false)}
                        className="px-3 py-1 text-xs text-fg-muted hover:text-fg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-gold px-3 py-1 font-mono text-xs font-bold text-gold-ink hover:bg-gold-hover"
                      >
                        Save Note
                      </button>
                    </div>
                  </form>
                )}

                {source.notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-line bg-surface-2 p-5 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded font-mono text-xs font-bold text-fg-muted bg-surface-2 px-2 py-0.5 ">
                        {note.category}
                      </span>
                      <span className="text-xs font-mono text-fg-muted">{note.updatedAt}</span>
                    </div>

                    <h4 className="text-sm font-bold text-fg">{note.title}</h4>

                    <div className="text-xs leading-relaxed text-fg-body whitespace-pre-wrap font-sans bg-surface-1 p-3 rounded-xl border border-line">
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: RESEARCH PAPER */}
            {activeTab === 'paper' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-line bg-surface-2 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="rounded font-mono text-xs font-bold text-fg-muted bg-surface-2 px-2 py-0.5">
                        {source.researchPaper.conference} ({source.researchPaper.year})
                      </span>
                      <h3 className="mt-2 font-display text-xl font-normal text-fg">
                        {source.researchPaper.title}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-fg-muted">
                        {source.researchPaper.authors}
                      </p>
                    </div>

                    <a
                      href={source.researchPaper.arxivUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg hover:border-line-strong transition shrink-0 cursor-pointer"
                    >
                      <span>Read Paper</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-surface-2 p-5 space-y-2">
                  <h4 className="text-xs font-mono font-bold text-fg-muted ">
                    Paper Abstract
                  </h4>
                  <p className="text-xs leading-relaxed text-fg-body italic border-l-2 border-line-strong pl-3">
                    &ldquo;{source.researchPaper.abstract}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* TAB: VIDEO */}
            {activeTab === 'video' && source.youtubeId && (
              <div className="space-y-4">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-bg shadow-2xl border border-line">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${source.youtubeId}?autoplay=0&rel=0`}
                    title={source.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SCREEN: KNOWLEDGE GRAPH (Mirroring Screenshot 2) */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col bg-surface-1 overflow-hidden relative">
          {/* Header Bar */}
          <div className="border-b border-line bg-surface-1 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-fg-muted" />
              <span className="font-mono text-xs font-bold text-fg-body">
                Knowledge graph
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* STAMINA 410 Badge from Screenshot 2 */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-fg-muted ">Stamina</span>
                <span className="font-bold text-gold text-sm">410</span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border border-line rounded-lg p-0.5 bg-surface-2">
                <button
                  type="button"
                  onClick={() => setGraphZoom((z) => Math.max(0.65, Number((z - 0.15).toFixed(2))))}
                  title="Zoom Out"
                  className="w-6 h-6 rounded flex items-center justify-center text-fg-muted hover:text-fg"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setGraphZoom(1.0)}
                  className="px-1.5 py-0.5 text-xs font-mono text-fg-body hover:text-fg"
                >
                  {Math.round(graphZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setGraphZoom((z) => Math.min(1.5, Number((z + 0.15).toFixed(2))))}
                  title="Zoom In"
                  className="w-6 h-6 rounded flex items-center justify-center text-fg-muted hover:text-fg"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Share Knowledge Graph Button */}
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                title="Share this Knowledge Graph"
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1 font-mono text-xs text-fg-body hover:border-line-strong hover:text-fg transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-fg-muted" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* SVG Canvas Area */}
          <div className="flex-1 relative overflow-hidden bg-surface-1 select-none min-h-[420px]">
            {/* Dark Radial Dot Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Scaled Canvas */}
            <div
              className="w-full h-full relative overflow-auto p-8"
              style={{
                transform: `scale(${graphZoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ minWidth: 720, minHeight: 480 }}
              >
                {visibleEdges.map((edge) => {
                  const sourceNode = source.knowledgeGraph.nodes.find((n) => n.id === edge.source);
                  const targetNode = source.knowledgeGraph.nodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const sx = sourceNode.x + 72;
                  const sy = sourceNode.y + 28;
                  const tx = targetNode.x + 72;
                  const ty = targetNode.y + 28;

                  if (edge.isDenseCrosslink) {
                    const mx = (sx + tx) / 2 + (tx > sx ? -24 : 24);
                    const my = Math.min(sy, ty) - 30;
                    return (
                      <g key={edge.id} className="animate-fadeIn">
                        <path
                          d={`M ${sx} ${sy} Q ${mx} ${my}, ${tx} ${ty}`}
                          fill="none"
                          stroke="var(--color-line-strong)"
                          strokeWidth={2}
                          strokeDasharray="5 3"
                        />
                        {edge.label && (
                          <g>
                            <rect
                              x={mx - 32}
                              y={my - 8}
                              width="64"
                              height="16"
                              rx="4"
                              fill="var(--color-surface-2)"
                              stroke="var(--color-line-strong)"
                              strokeWidth="0.8"
                            />
                            <text
                              x={mx}
                              y={my + 3.5}
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight="700"
                              fill="var(--color-fg-muted)"
                              fontFamily="monospace"
                            >
                              {edge.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  }

                  const my = (sy + ty) / 2;
                  return (
                    <path
                      key={edge.id}
                      d={`M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`}
                      fill="none"
                      stroke="var(--color-line-strong)"
                      strokeWidth={
                        sourceNode.status === 'mastered' && targetNode.status === 'mastered' ? 2.5 : 1.5
                      }
                      strokeDasharray={targetNode.status === 'unexplored' ? '4 3' : 'none'}
                    />
                  );
                })}
              </svg>

              {/* Circular Nodes on Canvas */}
              <div className="relative" style={{ minWidth: 720, minHeight: 460 }}>
                {visibleNodes.map((node) => {
                  const isSelected = selectedNode ? node.id === selectedNode.id : false;
                  const collapsedCount = semanticTier === 'macro' ? getCollapsedChildrenCount(node.id) : 0;

                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setIsDetailOpen(true);
                      }}
                      className={`absolute w-36 flex flex-col items-center text-center transition-all duration-300 cursor-pointer group select-none ${
                        isSelected ? 'scale-105 z-20' : 'hover:scale-105 z-10'
                      }`}
                      style={{ left: node.x, top: node.y }}
                    >
                      <div className="relative">
                        {collapsedCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGraphZoom(1.35);
                              setSelectedNodeId(node.id);
                              setIsDetailOpen(true);
                            }}
                            className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded font-mono bg-surface-2 border border-line-strong text-fg px-2 py-0.5 text-[8.5px] font-bold shadow-md hover:bg-surface-3 transition flex items-center gap-1 z-30 cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>+{collapsedCount} Invariants</span>
                          </button>
                        )}

                        {/* Circular Glyphs in Dark Obsidian Theme */}
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                            node.status === 'mastered'
                              ? 'border-gold bg-surface-2 text-gold ring-2 ring-gold/20'
                              : node.status === 'in_progress'
                              ? 'border-explored bg-surface-2 text-explored ring-2 ring-explored/20'
                              : 'border-dashed border-line-strong bg-surface-1 text-fg-muted'
                          } ${
                            isSelected
                              ? 'ring-4 ring-line-strong shadow-xl'
                              : 'group-hover:border-line/50'
                          }`}
                        >
                          {node.status === 'mastered' ? (
                            <CheckCircle2 className="w-6 h-6 text-gold" />
                          ) : node.status === 'in_progress' ? (
                            <Layers className="w-5 h-5 text-explored" />
                          ) : (
                            <HelpCircle className="w-5 h-5 text-fg-muted" />
                          )}
                        </div>

                        {/* Status dot */}
                        <div
                          className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-line-strong ${
                            node.status === 'mastered'
                              ? 'bg-gold'
                              : node.status === 'in_progress'
                              ? 'bg-explored'
                              : 'bg-surface-3'
                          }`}
                        />
                      </div>

                      {/* Text below node: Name + 1 simple line */}
                      <div className="mt-2 w-full px-1">
                        <div className="text-xs font-bold text-fg leading-snug line-clamp-2">
                          {node.label}
                        </div>
                        <div className="mt-0.5 text-xs text-fg-muted font-medium leading-tight line-clamp-1">
                          {node.shortLine || node.summary}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail Popover Drawer */}
            {isDetailOpen && selectedNode && (
              <div className="absolute inset-x-4 bottom-28 top-auto max-h-[70%] overflow-y-auto rounded-2xl border border-line-strong bg-surface-2/98 backdrop-blur-md p-5 shadow-2xl z-40 animate-fadeIn space-y-3">
                <div className="flex items-start justify-between gap-3 border-b border-line pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-fg-muted bg-surface-2 px-2 py-0.5 rounded">
                      {selectedNode.category}
                    </span>
                    <span className="font-mono text-xs text-fg-muted">
                      ● {selectedNode.status.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDetailOpen(false)}
                    className="w-6 h-6 rounded-full bg-surface-2/10 text-fg-muted hover:text-fg flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h3 className="font-display text-lg text-fg font-normal">{selectedNode.label}</h3>
                  <p className="text-xs text-fg-muted italic">
                    &ldquo;{selectedNode.shortLine || selectedNode.summary}&rdquo;
                  </p>
                </div>

                {selectedNode.keyFormula && (
                  <div className="rounded-xl bg-surface-1 border border-line p-3 font-mono text-xs text-fg">
                    {selectedNode.keyFormula}
                  </div>
                )}

                <p className="text-xs text-fg-body leading-relaxed">
                  {selectedNode.summary}
                </p>

                {selectedNode.failureMode && (
                  <div className="rounded-xl border border-trap/40 bg-trap-wash p-3 text-xs text-trap">
                    <span className="font-bold text-trap block mb-1">Architectural Failure Mode:</span>
                    {selectedNode.failureMode}
                  </div>
                )}

                {/* Interactive Node Quizzes (4-5 quizzes belonging to this node) */}
                <div className="pt-3 border-t border-line space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-fg-muted flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Concept Mastery Quizzes ({nodeQuizzes.filter(q => q.isAnsweredCorrectly).length} / {nodeQuizzes.length} Passed)
                    </span>
                    <span className="text-xs font-mono text-fg-muted">
                      Tap an option for instant verification
                    </span>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {nodeQuizzes.map((quiz, qIdx) => {
                      return (
                        <div key={quiz.id} className="rounded-xl border border-line bg-surface-1 p-3.5 space-y-2.5">
                          <p className="text-xs font-semibold text-fg leading-snug">
                            {qIdx + 1}. {quiz.question}
                          </p>
                          <div className="space-y-1.5">
                            {quiz.options.map((opt, optIdx) => {
                              const isSelected = quiz.userSelectedIndex === optIdx;
                              const isCorrectOpt = optIdx === quiz.correctOptionIndex;
                              const isAnswered = quiz.userSelectedIndex !== null && quiz.userSelectedIndex !== undefined;
                              let btnClass = 'border-line bg-surface-2 text-fg-body hover:border-line-strong';
                              if (isAnswered) {
                                if (isCorrectOpt) btnClass = 'border-explored/80 bg-explored/60 text-explored font-semibold';
                                else if (isSelected) btnClass = 'border-trap/80 bg-trap-wash text-trap';
                              }
                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => handleSelectQuizOption(quiz.id, optIdx)}
                                  className={`w-full text-left text-xs p-2.5 rounded-lg border transition flex items-start gap-2.5 cursor-pointer ${btnClass}`}
                                >
                                  <span className="font-mono text-xs text-fg-muted font-bold shrink-0 mt-0.5">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <span className="leading-relaxed">{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                          {quiz.userSelectedIndex !== null && quiz.userSelectedIndex !== undefined && (
                            <div
                              className={`p-2.5 rounded-lg bg-bg/60 text-xs text-fg-body border-l-2 leading-relaxed ${
                                quiz.isAnsweredCorrectly ? 'border-explored' : 'border-trap'
                              }`}
                            >
                              <span
                                className={`font-bold block mb-0.5 ${
                                  quiz.isAnsweredCorrectly ? 'text-explored' : 'text-trap'
                                }`}
                              >
                                {quiz.isAnsweredCorrectly ? '✓ Correct Reasoning:' : '⚠ Concept Breakdown:'}
                              </span>
                              {quiz.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => handleToggleNodeStatus(selectedNode.id)}
                    className="rounded-lg bg-gold px-3.5 py-1.5 text-xs font-bold text-gold-ink hover:bg-gold-hover transition cursor-pointer"
                  >
                    {selectedNode.status === 'mastered' ? '✓ Mastered' : 'Mark as Mastered'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('quizzes');
                      setIsDetailOpen(false);
                    }}
                    className="text-xs font-mono text-fg-muted hover:text-fg hover:underline cursor-pointer"
                  >
                    Practice in Quiz Tab →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM SOCRATIC INQUIRY BAR & KNOWLEDGE PIPELINE (PRD §3 & §5) */}
          <div className="border-t border-line bg-surface-1 p-4 space-y-3 shrink-0">
            {/* PRD §5: High-Visibility Adversarial AI Trap Alert */}
            {activeTrap && (
              <div className="rounded-xl border border-trap/60 bg-trap/60 p-4 space-y-3 animate-fadeIn shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-trap" />
                    <span className="font-mono text-xs font-bold text-trap ">
                      ⚠ Be careful here
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-trap bg-trap/60 px-2 py-0.5 rounded border border-trap/40">
                    Input locked
                  </span>
                </div>

                <p className="text-xs text-trap leading-relaxed font-sans">
                  {activeTrap.scenario}
                </p>

                <div className="pt-2 border-t border-trap/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-mono text-trap">
                    Invariant: {activeTrap.resolution}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTrap(null)}
                    className="rounded-lg bg-trap px-3.5 py-1.5 font-mono text-xs font-bold text-fg hover:bg-trap/80 transition cursor-pointer shrink-0"
                  >
                    Overcome trap &amp; unlock →
                  </button>
                </div>
              </div>
            )}

            {/* Socratic Scaffolding Prompt for selected node */}
            <div className="text-xs text-fg-body leading-relaxed font-sans space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-fg-muted bg-surface-2 px-2 py-0.5 rounded">
                  {selectedNode?.category || source.category}
                </span>
                <span className="font-mono text-xs text-fg-muted">
                  Concept: {selectedNode?.label || source.title}
                </span>
              </div>
              {researchMode && (
                <span className="text-gold font-mono text-xs block">
                  Research mode engaged: Socratic scaffolding &bull; direct answers forbidden
                </span>
              )}
              <p className="text-fg-body">
                {selectedNode ? selectedNode.summary : source.summary}
              </p>
            </div>

            {/* Socratic Follow-up Chips tailored to this node */}
            <div className="space-y-1">
              <span className="font-mono text-xs text-fg-muted ">
                Adaptive follow-ups (Socratic invariants)
              </span>
              <div className="flex flex-wrap gap-2">
                {nodeFollowUps.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAskInquiryQuestion(chip)}
                    className="rounded border border-line bg-surface-2 px-2.5 py-1 text-xs font-mono text-fg-body hover:border-line-strong hover:text-fg transition cursor-pointer text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Dialogue Stream */}
            {dialogueHistory.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2.5 pt-2 border-t border-line pr-1">
                {dialogueHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 text-xs leading-relaxed ${
                      item.role === 'user'
                        ? 'bg-surface-2 border border-line text-fg'
                        : 'bg-surface-1 border border-line-strong text-fg'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-fg-muted mb-1">
                      <span>{item.role === 'user' ? 'You' : 'Sarvam Reasoning Model'}</span>
                      <span>{item.time}</span>
                    </div>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Integrated Sarvam Inquiry Composer (6000 chars, Mic Recorder, Golden Voice Assistant Button) */}
            <div className="pt-2">
              <InquiryComposer
                disabled={Boolean(activeTrap)}
                loading={isAnsweringQuestion}
                inquiryId={inquiryId}
                placeholder="Ask a technical question about this concept or tap the golden voice button to speak in your language…"
                onSubmit={handleAskInquiryQuestion}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Share Knowledge Graph Modal */}
      <ShareGraphModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={source.title}
        rootTopic={source.category}
        nodeCount={source.knowledgeGraph.nodes.length}
        shareUrl={
          typeof window !== 'undefined'
            ? `${window.location.origin}/?source=${source.id}&view=workspaces`
            : `https://tattva.app/?source=${source.id}&view=workspaces`
        }
        graphData={{
          nodes: source.knowledgeGraph.nodes.map((n) => ({
            id: n.id,
            label: n.label,
            summary: n.summary,
          })),
          edges: source.knowledgeGraph.edges.map((e) => ({
            from: e.source,
            to: e.target,
            label: e.label,
          })),
        }}
      />
    </div>
  );
};
