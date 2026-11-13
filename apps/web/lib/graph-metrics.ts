import type { QuestionNode } from './workspace-types';

export type DiscussionTier = 'initial' | 'moderate' | 'deep' | 'divergent';

export interface NodeMetrics {
  tier: DiscussionTier;
  depth: number;
  childCount: number;
  exploredFollowUpsCount: number;
  relevanceScore: number; // 0 to 1
  conceptTag: string;
}

const CORE_DOMAIN_KEYWORDS = [
  'allocator', 'arena', 'bump', 'pointer', 'malloc', 'free', 'memory',
  'fragmentation', 'lifetime', 'stale', 'dangling', 'reclamation', 'cache',
  'stack', 'heap', 'buffer', 'alignment', 'page', 'reset', 'deallocation',
  'overhead', 'syscall', 'mprotect', 'madvise', 'virtual', 'address'
];

/**
 * Derives a clean 2-3 word conceptual tag from question text.
 */
export function deriveConceptTag(question: string): string {
  const clean = question.replace(/^[^\w]+|[^\w]+$/g, '').trim();
  const lower = clean.toLowerCase();
  
  if (lower.includes('bump pointer')) return 'Bump Pointer';
  if (lower.includes('stale pointer') || lower.includes('dangling')) return 'Stale Aliasing';
  if (lower.includes('free-list') || lower.includes('free list')) return 'Free-List Tradeoff';
  if (lower.includes('hybrid')) return 'Hybrid Allocator';
  if (lower.includes('fragmentation')) return 'Memory Fragmentation';
  if (lower.includes('reset') || lower.includes('rewind')) return 'Arena Reset';
  if (lower.includes('webassembly') || lower.includes('wasm')) return 'WASM Linear Memory';
  if (lower.includes('malloc')) return 'Malloc vs Arena';
  if (lower.includes('lifetime') || lower.includes('scope')) return 'Object Lifetimes';
  if (lower.includes('performance') || lower.includes('speed') || lower.includes('overhead')) return 'Performance Bounds';

  // Fallback: take first 3 meaningful words
  const words = clean.split(/\s+/).filter(w => w.length > 2 && !['what', 'how', 'why', 'can', 'does', 'the', 'and', 'for'].includes(w.toLowerCase()));
  if (words.length >= 2) {
    return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return clean.slice(0, 20);
}

/**
 * Computes depth, child metrics, and relevance scores for each node in the graph.
 */
export function computeNodeMetrics(nodes: QuestionNode[]): Map<string, NodeMetrics> {
  const metrics = new Map<string, NodeMetrics>();
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string | null>();

  for (const node of nodes) {
    parentMap.set(node.id, node.parentNodeId);
    if (node.parentNodeId) {
      const current = childrenMap.get(node.parentNodeId) ?? [];
      current.push(node.id);
      childrenMap.set(node.parentNodeId, current);
    }
  }

  // Calculate depth for each node
  const getDepth = (id: string): number => {
    let depth = 0;
    let curr = parentMap.get(id);
    while (curr) {
      depth++;
      curr = parentMap.get(curr);
      if (depth > 50) break; // cycle guard
    }
    return depth;
  };

  for (const node of nodes) {
    const depth = getDepth(node.id);
    const children = childrenMap.get(node.id) ?? [];
    const childCount = children.length;
    const exploredFollowUpsCount = node.followUps.filter(f => f.isSelected || f.childNodeId).length;
    const conceptTag = deriveConceptTag(node.userQuestion);

    // Calculate domain relevance score
    const textToAnalyze = (node.userQuestion + ' ' + node.aiExplanation).toLowerCase();
    const matchedCount = CORE_DOMAIN_KEYWORDS.filter(k => textToAnalyze.includes(k)).length;
    const relevanceScore = Math.min(1, matchedCount / 3);

    // Determine tier
    let tier: DiscussionTier = 'initial';
    
    // If significantly divergent from domain keywords (and not root)
    if (depth > 0 && relevanceScore < 0.25) {
      tier = 'divergent';
    } else if (childCount >= 2 || (depth >= 2 && childCount >= 1) || exploredFollowUpsCount >= 2) {
      tier = 'deep';
    } else if (childCount >= 1 || exploredFollowUpsCount >= 1 || depth >= 1) {
      tier = 'moderate';
    } else {
      tier = 'initial';
    }

    metrics.set(node.id, {
      tier,
      depth,
      childCount,
      exploredFollowUpsCount,
      relevanceScore,
      conceptTag
    });
  }

  return metrics;
}
