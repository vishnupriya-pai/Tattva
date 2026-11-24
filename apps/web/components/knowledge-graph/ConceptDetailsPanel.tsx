'use client';

import { useMemo } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { ConceptGraph } from '@tattva/contracts';
import type { KnowledgeGraphAnalysis, MasteryStatus } from '@tattva/graph-analytics';
import { RELATION_LABEL } from '../../lib/concept-map';
import type { QuestionNode } from '../../lib/workspace-types';

const STATUS_LABEL: Record<MasteryStatus, string> = {
  untouched: 'Not studied yet',
  touched: 'Touched',
  explored: 'Explored',
  mastered: 'Mastered',
  misconception: 'Misconception to resolve',
};

/** Side panel for one concept: how well it is known, how it relates, and where it was explained. */
export function ConceptDetailsPanel({
  conceptId,
  graph,
  analysis,
  nodes,
  onSelectConcept,
  onOpenQuestion,
  onClose,
}: {
  conceptId: string;
  graph: ConceptGraph;
  analysis: KnowledgeGraphAnalysis;
  nodes: readonly QuestionNode[];
  onSelectConcept: (conceptId: string) => void;
  onOpenQuestion: (nodeId: string) => void;
  onClose: () => void;
}) {
  const insight = analysis.concepts[conceptId];
  const nameOf = (id: string) => analysis.concepts[id]?.name ?? 'Unknown concept';

  const relations = useMemo(
    () =>
      graph.conceptEdges
        .filter((e) => e.sourceConceptId === conceptId || e.targetConceptId === conceptId)
        .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id)),
    [graph.conceptEdges, conceptId],
  );

  const questions = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return graph.nodeConcepts
      .filter((l) => l.conceptId === conceptId && byId.has(l.questionNodeId))
      .sort((a, b) => b.weight - a.weight)
      .map((l) => ({ node: byId.get(l.questionNodeId)!, role: l.role }));
  }, [graph.nodeConcepts, nodes, conceptId]);

  if (!insight) return null;
  const community = analysis.communities.find((c) => c.id === insight.communityId);

  return (
    <aside className="absolute inset-x-0 bottom-0 z-20 flex max-h-[60%] flex-col border-t border-line bg-surface-1 shadow-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[340px] sm:border-l sm:border-t-0">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-fg">{insight.name}</h3>
          <p className={`mt-0.5 text-xs ${insight.mastery.status === 'misconception' ? 'text-trap' : 'text-fg-muted'}`}>
            {STATUS_LABEL[insight.mastery.status]} · {Math.round(insight.mastery.score * 100)}%
            {insight.mastery.inferred ? ' (partly inferred)' : ''}
          </p>
          {community && community.conceptIds.length > 1 && (
            <p className="mt-0.5 text-xs text-fg-faint">Cluster: {community.label}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close concept details"
          className="cursor-pointer rounded-lg p-1 text-fg-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
        {insight.isKeystone && (
          <p className="rounded-lg border border-gold-line bg-gold-wash px-3 py-2 text-xs text-fg">
            Keystone concept: it links parts of your map that are otherwise separate.
          </p>
        )}

        <section>
          <h4 className="mb-2 font-mono text-xs uppercase tracking-wide text-fg-faint">
            Connections ({relations.length})
          </h4>
          {relations.length === 0 ? (
            <p className="text-xs text-fg-muted">No typed relations yet.</p>
          ) : (
            <ul className="space-y-2">
              {relations.map((e) => {
                const name = (id: string) =>
                  id === conceptId ? (
                    <span className="font-semibold text-fg">{nameOf(id)}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectConcept(id)}
                      className="cursor-pointer font-semibold text-gold hover:underline"
                    >
                      {nameOf(id)}
                    </button>
                  );
                return (
                  <li key={e.id} className="rounded-lg border border-line px-3 py-2">
                    <p className="text-sm text-fg">
                      {name(e.sourceConceptId)}{' '}
                      <span className="text-fg-muted">{RELATION_LABEL[e.relationType]}</span>{' '}
                      {name(e.targetConceptId)}
                      {e.origin === 'predicted' && <span className="ml-1 text-xs text-fg-faint">(suggested)</span>}
                    </p>
                    {e.justification && <p className="mt-1 text-xs leading-relaxed text-fg-muted">{e.justification}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h4 className="mb-2 font-mono text-xs uppercase tracking-wide text-fg-faint">
            Explained in ({questions.length})
          </h4>
          <ul className="space-y-1.5">
            {questions.map(({ node, role }) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => onOpenQuestion(node.id)}
                  className="group flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-faint group-hover:text-gold" />
                  <span className="text-sm leading-snug text-fg-body">
                    {node.userQuestion}
                    <span className="ml-1 text-xs text-fg-faint">· {role}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
