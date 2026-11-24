import type { ConceptGraph, QuestionNode } from '@tattva/contracts';
import { slugifyConcept, type KnownConcept } from './conceptExtraction';

/**
 * Bounded learning-path context for node generation (docs/INTELLIGENCE_ARCHITECTURE.md §3).
 *
 * Ported from Build-With-Sarvam's graphContext.ts, but works over the node list
 * `createQuestionNodeForUser` has already loaded, so it does no extra DB reads.
 * Pure and side-effect free: never calls Sarvam, never writes.
 *
 * - Parent and grandparent are included verbatim (truncated).
 * - Anything older is folded into one deterministic, bounded digest.
 */

export class GraphContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphContextError';
  }
}

export interface AncestorContext {
  nodeId: string;
  question: string;
  explanation: string;
}

export interface GraphContext {
  /** Depth the new node will occupy: 0 for a root, 1 for a child, 2 for a grandchild, … */
  depth: number;
  parent: AncestorContext | null;
  grandparent: AncestorContext | null;
  /** Digest of ancestry older than the grandparent, oldest first; null unless depth >= 3. */
  olderAncestrySummary: string | null;
}

export const VERBATIM_EXPLANATION_CHAR_CAP = 1500;
export const OLDER_ANCESTRY_SUMMARY_CHAR_CAP = 1000;
const OLDER_ANCESTRY_PER_NODE_CHAR_CAP = 200;
/** Guarantees termination on corrupted data; not a limit on real learning journeys. */
const MAX_ANCESTRY_TRAVERSAL = 50;

type AncestorNode = Pick<QuestionNode, 'id' | 'parentNodeId' | 'userQuestion' | 'aiExplanation'>;

function truncate(text: string, cap: number): string {
  if (text.length <= cap) return text;
  return `${text.slice(0, cap - 1).trimEnd()}…`;
}

function toAncestorContext(node: AncestorNode): AncestorContext {
  return {
    nodeId: node.id,
    question: node.userQuestion,
    explanation: truncate(node.aiExplanation, VERBATIM_EXPLANATION_CHAR_CAP),
  };
}

function buildOlderAncestrySummary(olderNearestFirst: AncestorNode[]): string {
  let summary = '';
  for (const node of [...olderNearestFirst].reverse()) {
    const entry = `Q: ${truncate(node.userQuestion, OLDER_ANCESTRY_PER_NODE_CHAR_CAP)} A: ${truncate(node.aiExplanation, OLDER_ANCESTRY_PER_NODE_CHAR_CAP)}`;
    const candidate = summary ? `${summary} | ${entry}` : entry;
    if (candidate.length > OLDER_ANCESTRY_SUMMARY_CHAR_CAP) break;
    summary = candidate;
  }
  return summary;
}

/**
 * Builds bounded context for the node about to be created under `parentNodeId`.
 * `nodes` must be the inquiry's own nodes (already ownership-checked by the caller).
 */
export function buildGraphContext(nodes: readonly AncestorNode[], parentNodeId: string | null | undefined): GraphContext {
  if (!parentNodeId) {
    return { depth: 0, parent: null, grandparent: null, olderAncestrySummary: null };
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const chain: AncestorNode[] = [];
  const visited = new Set<string>();
  let currentId: string | null = parentNodeId;

  while (currentId && chain.length < MAX_ANCESTRY_TRAVERSAL) {
    if (visited.has(currentId)) {
      throw new GraphContextError(`Cyclic ancestry detected at node ${currentId}`);
    }
    visited.add(currentId);
    const node = byId.get(currentId);
    if (!node) {
      throw new GraphContextError(`Invalid ancestry: node ${currentId} is not part of this inquiry`);
    }
    chain.push(node);
    currentId = node.parentNodeId;
  }

  const [parent, grandparent, ...older] = chain;
  return {
    depth: chain.length,
    parent: parent ? toAncestorContext(parent) : null,
    grandparent: grandparent ? toAncestorContext(grandparent) : null,
    olderAncestrySummary: older.length > 0 ? buildOlderAncestrySummary(older) : null,
  };
}

export const CROSS_BRANCH_MAX_ENTRIES = 8;
export const CROSS_BRANCH_CHAR_CAP = 1200;
const CROSS_BRANCH_QUESTION_CHAR_CAP = 160;
const CROSS_BRANCH_CONCEPTS_PER_ENTRY = 4;
export const KNOWN_CONCEPTS_MAX = 40;

type DigestNode = Pick<QuestionNode, 'id' | 'parentNodeId' | 'userQuestion'> & { createdAt?: string };

/**
 * Bounded digest of questions OUTSIDE the new node's ancestry (sibling and
 * cousin branches), newest first, each with its top concepts. Ancestry is
 * already sent verbatim by buildGraphContext; this is what lets the model
 * notice that the new question connects to a different branch.
 * Returns '' when there are no other branches.
 */
export function buildCrossBranchDigest(
  nodes: readonly DigestNode[],
  parentNodeId: string | null | undefined,
  conceptNamesByNode: ReadonlyMap<string, readonly string[]> = new Map(),
): string {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ancestry = new Set<string>();
  let currentId: string | null | undefined = parentNodeId;
  while (currentId && !ancestry.has(currentId) && ancestry.size < MAX_ANCESTRY_TRAVERSAL) {
    ancestry.add(currentId);
    currentId = byId.get(currentId)?.parentNodeId ?? null;
  }

  const others = nodes
    .filter((node) => !ancestry.has(node.id))
    .slice()
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, CROSS_BRANCH_MAX_ENTRIES);

  const lines: string[] = [];
  let length = 0;
  for (const node of others) {
    const concepts = (conceptNamesByNode.get(node.id) ?? []).slice(0, CROSS_BRANCH_CONCEPTS_PER_ENTRY);
    const line = `- Q: ${truncate(node.userQuestion.replace(/\s+/g, ' '), CROSS_BRANCH_QUESTION_CHAR_CAP)}${concepts.length ? ` [concepts: ${concepts.join(', ')}]` : ''}`;
    if (length + line.length + 1 > CROSS_BRANCH_CHAR_CAP) break;
    lines.push(line);
    length += line.length + 1;
  }
  return lines.join('\n');
}

/** Canonical concept names already in this inquiry, most-connected first, bounded. */
export function formatKnownConcepts(names: readonly string[]): string {
  return names.slice(0, KNOWN_CONCEPTS_MAX).join('; ');
}

export interface ConceptPromptContext {
  otherBranches: string;
  knownConcepts: string;
  /** Slugs plus alias slugs, so relations naming an alias still resolve. */
  knownConceptSlugs: string[];
  known: KnownConcept[];
}

/**
 * Turns the stored concept layer into the two prompt blocks (<other_branches>,
 * <known_concepts>). Concepts are ordered by degree (questions mentioning them)
 * so the most connected ideas survive the cap.
 */
export function buildConceptPromptContext(
  nodes: readonly DigestNode[],
  parentNodeId: string | null | undefined,
  graph: ConceptGraph,
): ConceptPromptContext {
  const conceptById = new Map(graph.concepts.map((c) => [c.id, c]));
  const degree = new Map<string, number>();
  const namesByNode = new Map<string, Array<{ name: string; weight: number }>>();
  for (const link of graph.nodeConcepts) {
    const concept = conceptById.get(link.conceptId);
    if (!concept) continue;
    degree.set(concept.id, (degree.get(concept.id) ?? 0) + 1);
    const list = namesByNode.get(link.questionNodeId) ?? [];
    list.push({ name: concept.name, weight: link.weight });
    namesByNode.set(link.questionNodeId, list);
  }
  const conceptNamesByNode = new Map(
    [...namesByNode].map(([nodeId, list]) => [nodeId, list.sort((a, b) => b.weight - a.weight).map((x) => x.name)]),
  );

  const ranked = graph.concepts.slice().sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
  const knownConceptSlugs = new Set<string>();
  for (const concept of graph.concepts) {
    knownConceptSlugs.add(concept.slug);
    for (const alias of concept.aliases) {
      const slug = slugifyConcept(alias);
      if (slug) knownConceptSlugs.add(slug);
    }
  }

  return {
    otherBranches: buildCrossBranchDigest(nodes, parentNodeId, conceptNamesByNode),
    knownConcepts: formatKnownConcepts(ranked.map((c) => c.name)),
    knownConceptSlugs: [...knownConceptSlugs],
    known: graph.concepts.map((c) => ({ name: c.name, slug: c.slug, aliases: c.aliases })),
  };
}

/** Renders the context as the labelled block that precedes the learner question; '' for a root node. */
export function formatGraphContext(context: GraphContext, selectedFollowUpText?: string | null): string {
  const parts: string[] = [];
  if (context.olderAncestrySummary) {
    parts.push(`EARLIER CONTEXT (summarized): ${context.olderAncestrySummary}`);
  }
  if (context.grandparent) {
    parts.push(`GRANDPARENT QUESTION: ${context.grandparent.question}\nGRANDPARENT EXPLANATION: ${context.grandparent.explanation}`);
  }
  if (context.parent) {
    parts.push(`PARENT QUESTION: ${context.parent.question}\nPARENT EXPLANATION: ${context.parent.explanation}`);
  }
  if (selectedFollowUpText) {
    parts.push(`THE LEARNER SELECTED THIS FOLLOW-UP: ${selectedFollowUpText}`);
  }
  return parts.join('\n\n');
}
