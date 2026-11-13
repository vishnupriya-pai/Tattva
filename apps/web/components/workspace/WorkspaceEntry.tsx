'use client';

import { useEffect, useState } from 'react';
import { getInquiry, getStamina } from '../../lib/api-client';
import { AuthNotConfiguredError } from '../../lib/auth';
import { ensureDemoInquiry } from '../../lib/workspace-bootstrap';
import type { LearningSource, QuestionNode, StaminaState } from '../../lib/workspace-types';
import { Workspace } from './Workspace';

type EntryState = { kind: 'loading' } | { kind: 'ready'; inquiryId: string; source: LearningSource; content: string; nodes: QuestionNode[]; stamina: StaminaState } | { kind: 'error'; message: string };

export function WorkspaceEntry() {
  const [state, setState] = useState<EntryState>({ kind: 'loading' });
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await ensureDemoInquiry();
        const [inquiry, stamina] = await Promise.all([getInquiry(session.inquiryId), getStamina()]);
        if (active) setState({
          kind: 'ready', inquiryId: session.inquiryId,
          source: {
            id: inquiry.data.learningSource.id,
            title: inquiry.data.learningSource.title,
            description: inquiry.data.learningSource.description,
            sourceType: inquiry.data.learningSource.sourceType,
            sourceReference: inquiry.data.learningSource.sourceReference,
            durationMinutes: inquiry.data.learningSource.durationMinutes,
          },
          content: inquiry.data.learningSource.content,
          nodes: inquiry.data.nodes.map((node) => ({ ...node, status: 'ready' as const })),
          stamina: stamina.data,
        });
      } catch (error) {
        if (!active) return;
        setState({ kind: 'error', message: error instanceof AuthNotConfiguredError
          ? 'Configure Supabase in apps/web/.env.local and apps/api/.env.local, then restart the dev servers.'
          : error instanceof Error ? error.message : 'Could not load your workspace.' });
      }
    })();
    return () => { active = false; };
  }, []);

  if (state.kind === 'loading') return <Status message="Loading your saved workspace…" />;
  if (state.kind === 'error') return <Status message={state.message} error />;
  return <Workspace
    source={state.source}
    sourceBody={state.content}
    initialNodes={state.nodes}
    initialStamina={state.stamina}
    inquiryId={state.inquiryId}
  />;
}

function Status({ message, error = false }: { message: string; error?: boolean }) {
  return <div className="grid h-screen place-items-center bg-[#0b0b0d] px-6 text-center text-sm text-white/70"><p className={error ? 'max-w-xl text-red-200' : ''}>{message}</p></div>;
}
