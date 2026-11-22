import type { QuestionNode } from '@tattva/contracts';

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
