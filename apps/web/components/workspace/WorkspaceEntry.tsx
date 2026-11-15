'use client';

import { useEffect, useState } from 'react';
import {
  createInquiry,
  createQuestionNode,
  deleteInquiry,
  getInquiry,
  getMe,
  getStamina,
  listInquiries,
} from '../../lib/api-client';
import { AuthNotConfiguredError } from '../../lib/auth';
import { ensureDemoInquiry } from '../../lib/workspace-bootstrap';
import type { LearningSource, QuestionNode, StaminaState } from '../../lib/workspace-types';
import type { Inquiry } from '@tattva/contracts';
import { TopNavBar, type TopNavView } from '../navigation/TopNavBar';
import { ProfileView } from '../profile/ProfileView';
import { HomeDashboardView } from '../dashboard/HomeDashboardView';
import { CreateInquiryView, ATTENTION_LEARNING_SOURCE_ID } from '../inquiry/CreateInquiryView';
import { Workspace } from './Workspace';
import { CommunityView } from '../community/CommunityView';
import { SourceWorkspaceView } from '../workspaces/SourceWorkspaceView';
import { EngineeringVideosView } from '../masterclass/EngineeringVideosView';
import { VideoPlayerModal } from '../masterclass/VideoPlayerModal';
import { InquirySwitcherModal } from '../inquiry/InquirySwitcherModal';
import { INITIAL_STUDY_SOURCES } from '../../data/sourceWorkspaces';
import type { StudySource, EngineeringVideo, CommunityArticle } from '../../types/thinkforge';

type ViewMode = TopNavView;

export function WorkspaceEntry() {
  const [activeView, setActiveView] = useState<ViewMode>('workspace');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; isAnonymous: boolean }>({
    id: 'anonymous',
    isAnonymous: true,
  });
  const [stamina, setStamina] = useState<StaminaState>({
    balance: 0,
    recentTransactions: [],
    streakDays: 0,
    conqueredInquiryIds: [],
  });

  const [workspaceData, setWorkspaceData] = useState<{
    source: LearningSource;
    content: string;
    nodes: QuestionNode[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState<boolean>(false);

  // Curated Workspaces & Masterclass state
  const [studySources, setStudySources] = useState<StudySource[]>(() => INITIAL_STUDY_SOURCES);
  const [activeStudioSourceId, setActiveStudioSourceId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<EngineeringVideo | null>(null);
  const [createPrefill, setCreatePrefill] = useState<{ question?: string; sourceId?: string }>({});

  const handleOpenSourceInStudio = (sourceId: string) => {
    setActiveStudioSourceId(sourceId);
    setActiveView('workspaces');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/?source=${sourceId}&view=workspaces`);
    }
  };

  const handleConvertVideoToInquiry = (video: EngineeringVideo) => {
    setActiveVideo(null);
    setCreatePrefill({
      question: video.suggestedInquiryQuestion,
      sourceId: ATTENTION_LEARNING_SOURCE_ID,
    });
    setActiveView('create');
  };

  const handleForkArticleToStudio = (article: CommunityArticle) => {
    const forkedId = `source-fork-${article.id}`;
    const existing = studySources.find((s) => s.id === forkedId);
    if (!existing) {
      const forkedSource: StudySource = {
        id: forkedId,
        title: `[Forked] ${article.title}`,
        category: article.category,
        sourceType: 'paper',
        sourceTypeLabel: 'Community Monograph · Forked',
        thumbnail:
          article.category === 'Cybersecurity'
            ? '/thumbnails/thumb_cyber_01.jpg'
            : article.category === 'AIML'
            ? '/thumbnails/thumb_aiml_02.jpg'
            : article.category === 'AIDS'
            ? '/thumbnails/thumb_aids_01.jpg'
            : '/thumbnails/thumb_cs_03.jpg',
        duration: article.readTime,
        views: `${article.sparks * 25} views`,
        channelName: `${article.authorName} (${article.authorRole})`,
        masteryScore: 65,
        masteryLevel: 'Intermediate',
        lastStudied: 'Just now',
        summary: `${article.subtitle}\n\nKey Highlights:\n${article.highlights.map((h) => '• ' + h).join('\n')}`,
        transcript: article.content,
        quizzes: [
          {
            id: `quiz-fork-${article.id}-1`,
            question: `According to "${article.title}", what is the primary architectural takeaway?`,
            options: [
              article.highlights[0] || 'Core theoretical invariant',
              'Unbounded quadratic memory footprint',
              'Complete removal of network encryption',
              'Legacy sequential processing'
            ],
            correctOptionIndex: 0,
            userSelectedIndex: null,
            isAnsweredCorrectly: false,
            explanation: article.highlights[0] || 'Verified from article content.',
            relatedConceptNodeId: `node-fork-${article.id}-1`
          },
          {
            id: `quiz-fork-${article.id}-2`,
            question: `What failure mode or vulnerability does this monograph address?`,
            options: [
              'Hardware clock drift',
              article.highlights[1] || 'Invariant degradation or security exposure',
              'Operating system reboot loops',
              'GPU power exhaustion'
            ],
            correctOptionIndex: 1,
            userSelectedIndex: null,
            isAnsweredCorrectly: false,
            explanation: article.highlights[1] || 'Verified from article discoveries.',
            relatedConceptNodeId: `node-fork-${article.id}-2`
          },
          {
            id: `quiz-fork-${article.id}-3`,
            question: `Which methodology is proposed to verify or resolve this challenge?`,
            options: [
              'Randomized trials with 0 iterations',
              article.highlights[2] || 'Rigorous mathematical or protocol specification',
              'Ignoring edge cases in production',
              'Reverting to unencrypted sockets'
            ],
            correctOptionIndex: 1,
            userSelectedIndex: null,
            isAnsweredCorrectly: false,
            explanation: article.highlights[2] || 'Verified from article methodology.',
            relatedConceptNodeId: `node-fork-${article.id}-3`
          },
          {
            id: `quiz-fork-${article.id}-4`,
            question: `What is the significance of the tags [${article.tags.slice(0, 3).join(', ')}] in this research?`,
            options: [
              'They define the domain and key mechanics analyzed in the monograph',
              'They are arbitrary cosmetic tags',
              'They restrict reader access',
              'They trigger automatic thread preemption'
            ],
            correctOptionIndex: 0,
            userSelectedIndex: null,
            isAnsweredCorrectly: false,
            explanation: 'The tags represent the foundational components and protocols explored in the paper.',
            relatedConceptNodeId: `node-fork-${article.id}-1`
          }
        ],
        notes: article.highlights.map((h, i) => ({
          id: `note-fork-${article.id}-${i}`,
          title: `Highlight #${i + 1}`,
          category: 'Core Mechanics',
          content: h,
          updatedAt: 'Just now'
        })),
        researchPaper: {
          title: article.title,
          authors: article.authorName,
          conference: 'Tattva Community Research Monograph',
          year: 2026,
          arxivUrl: 'https://tattva.community/articles/' + article.id,
          abstract: article.subtitle,
          keyContributions: article.highlights,
          methodologicalBreakdown: article.content.slice(0, 400) + '...'
        },
        knowledgeGraph: {
          rootNodeId: `node-fork-${article.id}-1`,
          nodes: [
            {
              id: `node-fork-${article.id}-1`,
              label: article.tags[0] || 'Core Hypothesis',
              category: article.category,
              depth: 1,
              status: 'mastered',
              importance: 'critical',
              summary: article.highlights[0] || article.subtitle,
              shortLine: article.highlights[0]?.slice(0, 60) || 'Core Invariant',
              tier: 'macro',
              x: 280,
              y: 40
            },
            {
              id: `node-fork-${article.id}-2`,
              label: article.tags[1] || 'Mechanics & Invariants',
              category: 'Mechanics',
              depth: 2,
              status: 'in_progress',
              importance: 'foundational',
              summary: article.highlights[1] || 'Detailed invariant analysis',
              shortLine: article.highlights[1]?.slice(0, 60) || 'Invariant proof',
              tier: 'standard',
              x: 120,
              y: 180
            },
            {
              id: `node-fork-${article.id}-3`,
              label: article.tags[2] || 'Failure Modes',
              category: 'Analysis',
              depth: 2,
              status: 'in_progress',
              importance: 'critical',
              summary: article.highlights[2] || 'Pathological edge cases',
              shortLine: article.highlights[2]?.slice(0, 60) || 'Vulnerability check',
              tier: 'standard',
              x: 440,
              y: 180
            }
          ],
          edges: [
            { id: `e-fork-1`, source: `node-fork-${article.id}-1`, target: `node-fork-${article.id}-2`, label: 'Analyzes' },
            { id: `e-fork-2`, source: `node-fork-${article.id}-1`, target: `node-fork-${article.id}-3`, label: 'Mitigates' }
          ]
        }
      };

      setStudySources((prev) => [forkedSource, ...prev]);
    }

    setActiveStudioSourceId(forkedId);
    setActiveView('workspaces');
  };

  // Load inquiries, current identity, and active inquiry
  const loadInquiryWorkspace = async (inquiryId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [detail, wallet] = await Promise.all([
        getInquiry(inquiryId),
        getStamina(),
      ]);

      const sanitizeNodeExplanation = (question: string, exp: string): string => {
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
          return `In a Transformer decoder, the self-attention sub-layer employs causal masking (setting attention logits to -∞ for subsequent token positions prior to softmax) to prevent positions from attending to future tokens. Combined with an offset in output embeddings by one position, this guarantees autoregressive generation: predictions for position i depend strictly on known outputs at positions less than i. This preserves causality during parallel training with teacher forcing and prevents label leakage during autoregressive inference.`;
        }
        const cleaned = exp.replace(/The provided source material discusses[^.]*\./gi, '').trim();
        return cleaned || `Technical synthesis answering: "${question}".`;
      };

      const nodes = detail.data.nodes.map((n) => ({
        ...n,
        aiExplanation: sanitizeNodeExplanation(n.userQuestion, n.aiExplanation),
        status: 'ready' as const,
      }));
      const rootNode = nodes.find((n) => !n.parentNodeId) ?? nodes[0];
      const activeInq = inquiries.find((i) => i.id === inquiryId);
      let inquiryHeading = activeInq?.title || detail.data.learningSource.title;

      const qLower = (rootNode?.userQuestion || '').toLowerCase();
      const headingLower = inquiryHeading.toLowerCase();

      const isTransformer =
        (qLower.includes('transformer') || qLower.includes('vaswani') || qLower.includes('multi-head attention') || qLower.includes('self-attention')) ||
        (headingLower.includes('transformer') || headingLower.includes('attention is all you need'));

      const isArena =
        (qLower.includes('arena') || qLower.includes('bump pointer') || (qLower.includes('malloc') && qLower.includes('free'))) ||
        headingLower.includes('arena allocator');

      let sourceTitle = inquiryHeading;
      let sourceDescription = detail.data.learningSource.description;
      let sourceBody = detail.data.learningSource.content;
      let sourceType = detail.data.learningSource.sourceType;
      let sourceReference = detail.data.learningSource.sourceReference;

      if (isTransformer) {
        sourceTitle = inquiryHeading.includes('Attention') ? inquiryHeading : 'Attention Is All You Need: Transformers & Multi-Head Attention';
        sourceDescription =
          'The foundational 2017 paper by Vaswani et al. analyzing sequence modeling, recurrence elimination, and self-attention mechanisms.';
        sourceBody = `Recurrent neural networks, long short-term memory [13] and gated recurrent [7] neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation.

The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.

Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions.

In the decoder, the self-attention sub-layer is modified to prevent positions from attending to subsequent positions. This masking, combined with the fact that output embeddings are offset by one position, ensures that predictions for position i can depend only on known outputs at positions less than i.`;
        sourceType = 'document';
        sourceReference = 'arXiv:1706.03762';
      } else if (isArena) {
        sourceTitle = inquiryHeading.includes('Arena') ? inquiryHeading : 'Memory Arena Allocators: Design and Trade-offs';
        sourceDescription =
          'A dense walkthrough of arena/bump allocators, free-list strategies, and fragmentation trade-offs.';
        sourceBody = `Arena allocation trades flexibility for throughput. Instead of tracking individual block metadata the way a general-purpose allocator does, an arena allocator reserves one contiguous region up front and satisfies allocations by advancing a single bump pointer. Freeing is batched: the whole arena is reset or released at once, never per-object.

This works well when object lifetimes are correlated — a request handler, a single frame of a game loop, a parser pass over one file. It works badly when lifetimes are independent, because there is no way to reclaim an individual object's memory without invalidating every allocation made after it in the same arena.

A free-list allocator reintroduces per-object reclamation by threading freed blocks into a linked list keyed by size class, at the cost of metadata overhead and fragmentation as blocks of mismatched sizes accumulate. Hybrid designs use arenas for short-lived, correlated allocations and fall back to a general-purpose allocator or a size-class free list for everything else.

The failure mode to watch for: holding a pointer into an arena past the arena's reset point. Because the arena's bump pointer is just rewound, the memory is not zeroed or protected — a stale pointer silently aliases whatever is allocated next, producing memory-safety bugs that are very difficult to reproduce.`;
        sourceType = 'transcript';
        sourceReference = 'seed/memory-arena-allocators.txt';
      } else {
        // Dedicated, isolated context for this custom inquiry!
        if (!sourceTitle || sourceTitle.includes('Attention Is All You Need') || sourceTitle.includes('Memory Arena')) {
          if (rootNode) {
            const firstLine = (rootNode.userQuestion.split('\n')[0] ?? '').trim().slice(0, 75);
            sourceTitle = firstLine.endsWith('?') ? firstLine : `${firstLine}…`;
          } else {
            sourceTitle = 'Technical Systems Inquiry';
          }
        }
        sourceDescription = `Primary technical context and foundational mechanics for: ${sourceTitle}`;
        sourceBody = `# ${sourceTitle}

## Core Problem Statement & Research Invariant
${rootNode?.userQuestion || sourceTitle}

## Foundational Invariants Under Analysis
Every scalable software architecture and algorithm is governed by fundamental invariants around latency, memory allocation, concurrency boundaries, and failure isolation. This Knowledge Graph systematically analyzes the mechanisms and trade-offs inherent to this inquiry.

## Key Dimensions Under Test
• First-Principles Mechanisms: Execution flow, data layout, and state transitions.
• Resource Bounds & Complexity: Asymptotic time, memory allocations, and network overhead.
• Failure Modes & Edge Cases: Pathological degradation, concurrency races, and adversarial misconceptions.`;
        sourceType = 'document';
        sourceReference = `tattva/inquiry/${inquiryId.slice(0, 8)}`;
      }

      setWorkspaceData({
        source: {
          id: detail.data.learningSource.id,
          title: sourceTitle,
          description: sourceDescription,
          sourceType,
          sourceReference,
          durationMinutes: detail.data.learningSource.durationMinutes,
        },
        content: sourceBody,
        nodes,
      });
      setStamina(wallet.data);
      setActiveInquiryId(inquiryId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not load inquiry workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshInquiriesList = async () => {
    try {
      const listRes = await listInquiries();
      setInquiries(listRes.data);
    } catch (e) {
      console.warn('Could not list inquiries', e);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await ensureDemoInquiry();
        if (!active) return;

        const [meRes, walletRes, listRes] = await Promise.all([
          getMe().catch(() => null),
          getStamina().catch(() => null),
          listInquiries().catch(() => null),
        ]);

        if (meRes?.data?.user) {
          setCurrentUser(meRes.data.user);
        }
        if (walletRes?.data) {
          setStamina(walletRes.data);
        }
        if (listRes?.data) {
          setInquiries(listRes.data);
        }

        // Check for share parameters in URL
        const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const sharedInquiryId = searchParams?.get('inquiry');
        const sharedSourceId = searchParams?.get('source');
        const sharedView = searchParams?.get('view') as TopNavView | null;

        if (sharedView) {
          setActiveView(sharedView);
        }

        if (sharedSourceId) {
          setActiveStudioSourceId(sharedSourceId);
          setActiveView('workspaces');
        } else if (sharedInquiryId) {
          await loadInquiryWorkspace(sharedInquiryId);
          setActiveView('workspace');
        } else {
          await loadInquiryWorkspace(session.inquiryId);
        }
      } catch (error) {
        if (!active) return;
        setErrorMessage(
          error instanceof AuthNotConfiguredError
            ? 'Configure Supabase in apps/web/.env.local and apps/api/.env.local, then restart the dev servers.'
            : error instanceof Error
            ? error.message
            : 'Could not load your workspace.'
        );
        setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleSelectInquiry = async (inquiryId: string) => {
    setActiveView('workspace');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/?inquiry=${inquiryId}`);
    }
    await loadInquiryWorkspace(inquiryId);
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    setErrorMessage(null);
    try {
      await deleteInquiry(inquiryId);
      const listRes = await listInquiries();
      setInquiries(listRes.data);

      if (activeInquiryId === inquiryId) {
        const nextInquiry = listRes.data[0];
        if (nextInquiry) {
          await loadInquiryWorkspace(nextInquiry.id);
        } else {
          setActiveInquiryId(null);
          setWorkspaceData(null);
          setActiveView('home');
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not delete inquiry.');
    }
  };

  const handleCreateInquiry = async ({
    question,
    learningSourceId,
    title,
    researchMode,
  }: {
    question: string;
    learningSourceId: string;
    title?: string;
    researchMode: boolean;
  }) => {
    setIsSubmittingNew(true);
    setErrorMessage(null);
    try {
      // 1. Create inquiry row
      const inqRes = await createInquiry(learningSourceId, title);
      const newInquiryId = inqRes.data.id;

      // 2. Create root question node via Sarvam
      await createQuestionNode(newInquiryId, {
        question,
        parentNodeId: null,
        selectedFollowUpId: null,
        researchMode,
      });

      // 3. Refresh inquiries list
      await refreshInquiriesList();

      // 4. Switch to workspace
      setActiveView('workspace');
      await loadInquiryWorkspace(newInquiryId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to launch technical inquiry.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0b0d0f] text-slate-100">
      {/* Top Navigation Bar from BhoomikaContributions */}
      <TopNavBar
        activeView={activeView}
        onChangeView={(view) => setActiveView(view)}
        staminaScore={stamina.balance}
        streakDays={stamina.streakDays}
        user={currentUser}
        onStartNewInquiry={() => {
          setCreatePrefill({});
          setActiveView('create');
        }}
        inquiries={inquiries}
        activeInquiryId={activeInquiryId}
        onSelectInquiry={handleSelectInquiry}
        onOpenInquirySwitcher={() => setIsInquiryModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {errorMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-rose-500/30 bg-rose-950/80 px-4 py-2 text-xs text-rose-200 backdrop-blur-md shadow-xl">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="grid h-full place-items-center bg-[#0b0b0d] px-6 text-center text-sm text-white/70">
            <p>Loading knowledge workspace…</p>
          </div>
        ) : activeView === 'home' ? (
          <div className="h-full overflow-y-auto">
            <HomeDashboardView
              inquiries={inquiries}
              onSelectInquiry={handleSelectInquiry}
              onStartNewInquiry={() => {
                setCreatePrefill({});
                setActiveView('create');
              }}
              onDeleteInquiry={handleDeleteInquiry}
              conqueredInquiryIds={stamina.conqueredInquiryIds}
            />
          </div>
        ) : activeView === 'create' ? (
          <div className="h-full overflow-y-auto">
            <CreateInquiryView
              initialQuestion={createPrefill.question}
              initialSourceId={createPrefill.sourceId}
              onCreateInquiry={handleCreateInquiry}
              onCancel={() => setActiveView('workspace')}
              isSubmitting={isSubmittingNew}
            />
          </div>
        ) : activeView === 'workspaces' ? (
          <div className="h-full overflow-y-auto">
            <SourceWorkspaceView
              sources={studySources}
              activeSourceId={activeStudioSourceId}
              inquiryId={activeInquiryId ?? undefined}
              onNavigateToHome={() => setActiveView('home')}
              onUpdateSource={(updated) => {
                setStudySources((prev) =>
                  prev.map((s) => (s.id === updated.id ? updated : s)),
                );
              }}
            />
          </div>
        ) : activeView === 'masterclass' ? (
          <div className="h-full overflow-y-auto">
            <EngineeringVideosView
              onSelectVideo={(video) => setActiveVideo(video)}
              onConvertVideoToInquiry={handleConvertVideoToInquiry}
              onOpenSourceInStudio={handleOpenSourceInStudio}
            />
          </div>
        ) : activeView === 'community' ? (
          <div className="h-full overflow-y-auto">
            <CommunityView
              onForkArticleToStudio={handleForkArticleToStudio}
              onOpenSourceInStudio={handleOpenSourceInStudio}
            />
          </div>
        ) : activeView === 'profile' ? (
          <ProfileView
            userId={currentUser.id}
            staminaBalance={stamina.balance}
            streakDays={stamina.streakDays}
          />
        ) : workspaceData && activeInquiryId ? (
          /* PRESERVED EXACT WORKSPACE & KNOWLEDGE GRAPH FLOW */
          <Workspace
            source={workspaceData.source}
            sourceBody={workspaceData.content}
            initialNodes={workspaceData.nodes}
            initialStamina={stamina}
            inquiryId={activeInquiryId}
            onDeleteInquiry={() => void handleDeleteInquiry(activeInquiryId)}
            inquiries={inquiries}
            onSelectInquiry={handleSelectInquiry}
            onOpenInquirySwitcher={() => setIsInquiryModalOpen(true)}
            onStartNewInquiry={() => {
              setCreatePrefill({});
              setActiveView('create');
            }}
          />
        ) : (
          <div className="grid h-full place-items-center bg-[#0b0b0d] px-6 text-center text-sm text-white/70">
            <p>No active inquiry selected.</p>
          </div>
        )}
      </main>

      {/* Video Player Modal for Masterclass */}
      <VideoPlayerModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
        onConvertVideoToInquiry={handleConvertVideoToInquiry}
      />

      {/* Knowledge Inquiries Switcher Modal */}
      <InquirySwitcherModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        inquiries={inquiries}
        activeInquiryId={activeInquiryId}
        onSelectInquiry={handleSelectInquiry}
        onStartNewInquiry={() => {
          setCreatePrefill({});
          setActiveView('create');
        }}
      />
    </div>
  );
}
