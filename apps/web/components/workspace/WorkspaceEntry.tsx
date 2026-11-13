'use client';

import { useEffect, useState } from 'react';
import {
  createInquiry,
  createQuestionNode,
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
import { CreateInquiryView } from '../inquiry/CreateInquiryView';
import { Workspace } from './Workspace';

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

  // Load inquiries, current identity, and active inquiry
  const loadInquiryWorkspace = async (inquiryId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [detail, wallet] = await Promise.all([
        getInquiry(inquiryId),
        getStamina(),
      ]);

      setWorkspaceData({
        source: {
          id: detail.data.learningSource.id,
          title: detail.data.learningSource.title,
          description: detail.data.learningSource.description,
          sourceType: detail.data.learningSource.sourceType,
          sourceReference: detail.data.learningSource.sourceReference,
          durationMinutes: detail.data.learningSource.durationMinutes,
        },
        content: detail.data.learningSource.content,
        nodes: detail.data.nodes.map((n) => ({ ...n, status: 'ready' as const })),
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

  const handleCreateInquiry = async ({
    question,
    learningSourceId,
    researchMode,
  }: {
    question: string;
    learningSourceId: string;
    researchMode: boolean;
  }) => {
    setIsSubmittingNew(true);
    setErrorMessage(null);
    try {
      // 1. Create inquiry row
      const inqRes = await createInquiry(learningSourceId);
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
              onStartNewInquiry={() => setActiveView('create')}
            />
          </div>
        ) : activeView === 'create' ? (
          <div className="h-full overflow-y-auto">
            <CreateInquiryView
              onCreateInquiry={handleCreateInquiry}
              onCancel={() => setActiveView('workspace')}
              isSubmitting={isSubmittingNew}
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
          />
        ) : (
          <div className="grid h-full place-items-center bg-[#0b0b0d] px-6 text-center text-sm text-white/70">
            <p>No active inquiry selected.</p>
          </div>
        )}
      </main>
    </div>
  );
}
