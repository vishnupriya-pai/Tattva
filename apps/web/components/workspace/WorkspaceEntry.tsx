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
import { HomeDashboardView } from '../dashboard/HomeDashboardView';
import { CreateInquiryView, ATTENTION_LEARNING_SOURCE_ID } from '../inquiry/CreateInquiryView';
import { Workspace } from './Workspace';
import { CommunityView } from '../community/CommunityView';
import { SourceWorkspaceView } from '../workspaces/SourceWorkspaceView';
import { EngineeringVideosView } from '../masterclass/EngineeringVideosView';
import { VideoPlayerModal } from '../masterclass/VideoPlayerModal';
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
  });

  const [workspaceData, setWorkspaceData] = useState<{
    source: LearningSource;
    content: string;
    nodes: QuestionNode[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Curated Workspaces & Masterclass state
  const [studySources, setStudySources] = useState<StudySource[]>(() => INITIAL_STUDY_SOURCES);
  const [activeStudioSourceId, setActiveStudioSourceId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<EngineeringVideo | null>(null);
  const [createPrefill, setCreatePrefill] = useState<{ question?: string; sourceId?: string }>({});

  const handleOpenSourceInStudio = (sourceId: string) => {
    setActiveStudioSourceId(sourceId);
    setActiveView('workspaces');
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

      const nodes = detail.data.nodes.map((n) => ({ ...n, status: 'ready' as const }));
      const rootNode = nodes.find((n) => !n.parentNodeId) ?? nodes[0];

      // Dynamic source title, description, and material corresponding to the active inquiry
      let sourceTitle = detail.data.learningSource.title;
      let sourceDescription = detail.data.learningSource.description;
      let sourceBody = detail.data.learningSource.content;
      let sourceType = detail.data.learningSource.sourceType;
      let sourceReference = detail.data.learningSource.sourceReference;

      if (rootNode) {
        const qLower = rootNode.userQuestion.toLowerCase();
        const isDefaultMemoryArena =
          qLower.includes('bump pointer') ||
          (qLower.includes('arena') && qLower.includes('malloc') && !qLower.includes('attention') && !qLower.includes('transformer'));

        if (!isDefaultMemoryArena) {
          if (
            qLower.includes('attention') ||
            qLower.includes('transformer') ||
            qLower.includes('recurrent neural network') ||
            qLower.includes('transduction')
          ) {
            sourceTitle = 'Attention Is All You Need: Transformers & Multi-Head Attention';
            sourceDescription =
              'The foundational 2017 paper by Vaswani et al. analyzing sequence modeling, recurrence elimination, and self-attention mechanisms.';
            sourceBody = rootNode.userQuestion;
            sourceType = 'document';
            sourceReference = 'arXiv:1706.03762';
          } else if (rootNode.userQuestion.length > 50) {
            const firstLine = (rootNode.userQuestion.split('\n')[0] ?? '').trim().slice(0, 90);
            sourceTitle = firstLine.endsWith('?') ? firstLine : `${firstLine}…`;
            sourceDescription = 'Source material and foundational context analyzed in this Knowledge Graph.';
            sourceBody = rootNode.userQuestion;
          }
        }
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

        await loadInquiryWorkspace(session.inquiryId);
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
        user={currentUser}
        onStartNewInquiry={() => setActiveView('create')}
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
        ) : workspaceData && activeInquiryId ? (
          /* PRESERVED EXACT WORKSPACE & KNOWLEDGE GRAPH FLOW */
          <Workspace
            source={workspaceData.source}
            sourceBody={workspaceData.content}
            initialNodes={workspaceData.nodes}
            initialStamina={stamina}
            inquiryId={activeInquiryId}
            onDeleteInquiry={() => void handleDeleteInquiry(activeInquiryId)}
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
    </div>
  );
}
