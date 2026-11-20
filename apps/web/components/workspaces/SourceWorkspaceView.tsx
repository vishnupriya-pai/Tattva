'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  Award,
  PlusCircle,
} from 'lucide-react';
import type { StudySource } from '../../types/thinkforge';
import { SourceWorkStudio } from './SourceWorkStudio';
import { TypographicJournalCover } from './TypographicJournalCover';

interface SourceWorkspaceViewProps {
  sources: StudySource[];
  onUpdateSource?: (updated: StudySource) => void;
  activeSourceId?: string | null;
  onNavigateToHome?: () => void;
  inquiryId?: string;
}

export const SourceWorkspaceView: React.FC<SourceWorkspaceViewProps> = ({
  sources: initialSources,
  onUpdateSource,
  activeSourceId: propActiveSourceId,
  onNavigateToHome,
  inquiryId,
}) => {
  const [sources, setSources] = useState<StudySource[]>(initialSources);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(
    propActiveSourceId || null
  );

  // Focus desk: strictly 2-3 active enrolled crucibles
  const [enrolledIds, setEnrolledIds] = useState<string[]>([
    'source-transformers',
    'source-os-sync',
    'source-rsa-crypto',
  ]);

  useEffect(() => {
    setActiveSourceId(propActiveSourceId || null);
    if (propActiveSourceId && !enrolledIds.includes(propActiveSourceId)) {
      setEnrolledIds((prev) => [propActiveSourceId, ...prev.slice(0, 2)]);
    }
  }, [propActiveSourceId]);

  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);

  const activeSource = useMemo(() => {
    if (!activeSourceId) return null;
    return sources.find((s) => s.id === activeSourceId) || null;
  }, [sources, activeSourceId]);

  // Display only the 2-3 enrolled courses
  const enrolledSources = useMemo(() => {
    return sources.filter((s) => enrolledIds.includes(s.id));
  }, [sources, enrolledIds]);

  const handleUpdateSource = (updated: StudySource) => {
    const next = sources.map((s) => (s.id === updated.id ? updated : s));
    setSources(next);
    onUpdateSource?.(updated);
  };

  // If an enrolled source is selected, launch the 50/50 Split Screen Crucible!
  if (activeSource) {
    return (
      <SourceWorkStudio
        source={activeSource}
        onBack={() => setActiveSourceId(null)}
        onUpdateSource={handleUpdateSource}
        inquiryId={inquiryId}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 text-fg">
      {/* Workspace Header: Focused Personal Crucible Desk */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-fg-muted bg-surface-2 px-2.5 py-0.5 rounded">
              Personal Crucible Desk
            </span>
            <span className="text-xs text-fg-muted">·</span>
            <span className="text-xs font-mono text-fg-muted">
              {enrolledSources.length} Active Enrolled Crucibles (Max 3)
            </span>
          </div>

          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-fg font-normal tracking-tight">
            My Active Workspaces
          </h1>

          <p className="mt-1 text-xs sm:text-sm text-fg-muted max-w-2xl leading-relaxed font-sans">
            Your high-focus execution desk. Unlike open-ended course directories, Tattva limits your active desk to 2–3 high-friction technical investigations to ensure deep cognitive immersion.
          </p>
        </div>

        {/* Global Mastery Snapshot */}
        <div className="flex items-center gap-4 bg-surface-2 border border-line rounded-2xl p-4 shadow-xl shrink-0">
          <div className="w-12 h-12 rounded-xl bg-surface-1 text-fg-muted flex items-center justify-center font-bold text-lg border border-line">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono text-fg-muted ">
              Desk Mastery Average
            </div>
            <div className="font-mono text-2xl font-bold text-fg">
              {enrolledSources.length > 0
                ? Math.round(
                    enrolledSources.reduce((acc, s) => acc + s.masteryScore, 0) /
                      enrolledSources.length
                  )
                : 0}
              %
            </div>
            <div className="text-xs text-fg-muted font-mono">
              {enrolledSources.length} Verified Crucibles in Progress
            </div>
          </div>
        </div>
      </div>

      {/* Grid of the 2-3 Enrolled Crucibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrolledSources.map((source, idx) => {
          const totalQuizzes = source.quizzes.length;
          const passedQuizzes = source.quizzes.filter((q) => q.isAnsweredCorrectly).length;
          const totalNodes = source.knowledgeGraph.nodes.length;
          const masteredNodes = source.knowledgeGraph.nodes.filter((n) => n.status === 'mastered').length;

          return (
            <div
              key={source.id}
              className="flex flex-col justify-between rounded-2xl border border-line bg-surface-2 p-5 shadow-2xl hover:border-line-strong transition-all duration-200 space-y-4"
            >
              {/* PRD §9 Standardized Typographic Cover */}
              <div
                className="cursor-pointer"
                onClick={() => setActiveSourceId(source.id)}
              >
                <TypographicJournalCover
                  title={source.title}
                  interlocutor={source.channelName || 'Curated Systems Fellow'}
                  subject={source.category}
                  durationMinutes={parseInt(source.duration || '35') || 35}
                  templateIndex={idx}
                  codeIndex={`0${idx + 1}`}
                />
              </div>

              {/* In-Depth Progress Metrics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-fg-muted">
                  <span className="font-bold text-fg-muted ">
                    Crucible #{idx + 1}
                  </span>
                  <span className="text-fg-muted">{source.lastStudied}</span>
                </div>

                <h3
                  onClick={() => setActiveSourceId(source.id)}
                  className="font-display text-lg font-normal text-fg transition cursor-pointer line-clamp-2 leading-snug"
                >
                  {source.title}
                </h3>

                <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed font-sans">
                  {source.summary}
                </p>

                {/* Cognitive Gauge */}
                <div className="rounded-xl border border-line bg-surface-1 p-3 space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-xs text-fg-muted ">
                      Mastery progress
                    </span>
                    <span className="font-bold text-fg">
                      {source.masteryScore}% · {source.masteryLevel}
                    </span>
                  </div>

                  <div className="w-full bg-surface-2/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        source.masteryScore >= 100 ? 'bg-gold' : 'bg-fg-body'
                      }`}
                      style={{ width: `${source.masteryScore}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-fg-muted pt-0.5">
                    <span>{masteredNodes}/{totalNodes} Nodes Mastered</span>
                    <span>{passedQuizzes}/{totalQuizzes} Invariants Verified</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSourceId(source.id)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-surface-2 border border-line-strong px-4 py-2.5 font-mono text-xs font-bold text-fg hover:bg-surface-3 transition cursor-pointer shadow-sm"
                >
                  <span>Resume split crucible</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Option to Browse More from Community Library if fewer than 3 */}
        {enrolledSources.length < 3 && (
          <div
            onClick={onNavigateToHome}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-1/60 p-8 text-center space-y-3 hover:border-line-strong transition cursor-pointer min-h-[380px]"
          >
            <div className="w-12 h-12 rounded-full bg-surface-2/5 flex items-center justify-center text-fg-muted">
              <PlusCircle className="w-6 h-6 text-fg-faint" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-fg">Enroll Another Crucible</h4>
              <p className="mt-1 text-xs text-fg-muted max-w-xs leading-relaxed">
                Browse verified 25+ min masterclasses on the community home page to add to your desk.
              </p>
            </div>
            <button
              type="button"
              className="mt-2 rounded-lg border border-line bg-surface-2 px-3.5 py-1.5 font-mono text-xs text-fg-muted hover:text-fg"
            >
              Browse Masterclasses →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
