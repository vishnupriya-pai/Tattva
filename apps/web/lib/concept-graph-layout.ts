import type { QuestionNode } from './workspace-types';
import type { NodeMetrics } from './graph-metrics';

const HORIZONTAL_GAP = 220;
const VERTICAL_GAP = 160;

export interface ClusterHull {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodeCount: number;
}

export interface GraphLayoutResult {
  positions: Record<string, { x: number; y: number }>;
  clusters: ClusterHull[];
}

/**
 * Computes an organized, collision-free cluster & tree layout for circular nodes.
 * Groups branches into conceptual subgraphs and bounds their visual hull.
 */
export function computeConceptGraphLayout(
  nodes: QuestionNode[],
  metrics: ReadonlyMap<string, NodeMetrics> = new Map(),
): GraphLayoutResult {
  if (nodes.length === 0) {
    return { positions: {}, clusters: [] };
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string | null>();

  for (const node of nodes) {
    parentMap.set(node.id, node.parentNodeId);
    if (node.parentNodeId && nodeMap.has(node.parentNodeId)) {
      const list = childrenMap.get(node.parentNodeId) ?? [];
      list.push(node.id);
      childrenMap.set(node.parentNodeId, list);
    }
  }

  const roots = nodes.filter(n => n.parentNodeId === null || !nodeMap.has(n.parentNodeId));
  if (roots.length === 0 && nodes.length > 0 && nodes[0]) {
    roots.push(nodes[0]);
  }

  // Calculate width/span of each subtree
  const spanMap = new Map<string, number>();
  const calculateSpan = (id: string): number => {
    const kids = childrenMap.get(id) ?? [];
    if (kids.length === 0) {
      spanMap.set(id, 1);
      return 1;
    }
    const total = kids.reduce((sum, kid) => sum + calculateSpan(kid), 0);
    const span = Math.max(1, total);
    spanMap.set(id, span);
    return span;
  };

  for (const root of roots) {
    calculateSpan(root.id);
  }

  const positions: Record<string, { x: number; y: number }> = {};

  const placeTree = (id: string, leftX: number, depth: number) => {
    const kids = childrenMap.get(id) ?? [];
    const span = spanMap.get(id) ?? 1;
    const myX = leftX + ((span - 1) * HORIZONTAL_GAP) / 2;
    const myY = depth * VERTICAL_GAP;

    positions[id] = { x: myX, y: myY };

    let currentChildLeft = leftX;
    for (const kid of kids) {
      const kidSpan = spanMap.get(kid) ?? 1;
      placeTree(kid, currentChildLeft, depth + 1);
      currentChildLeft += kidSpan * HORIZONTAL_GAP;
    }
  };

  let globalLeft = 0;
  for (const root of roots) {
    const span = spanMap.get(root.id) ?? 1;
    placeTree(root.id, globalLeft, 0);
    globalLeft += span * HORIZONTAL_GAP + 100;
  }

  // Compute conceptual cluster bounding hulls
  const clusters: ClusterHull[] = [];

  // Group subgraphs by primary branch (each immediate child of root represents a branch cluster)
  for (const root of roots) {
    const mainBranches = childrenMap.get(root.id) ?? [];
    
    // Create a cluster for root + immediate surrounding if small
    if (mainBranches.length === 0) {
      const rootPos = positions[root.id];
      if (rootPos) {
        clusters.push({
          id: `cluster-${root.id}`,
          label: 'Core Invariants & First Principles',
          x: rootPos.x - 70,
          y: rootPos.y - 50,
          width: 140,
          height: 140,
          nodeCount: 1,
        });
      }
      continue;
    }

    for (const branchId of mainBranches) {
      // Gather all descendants of this branch
      const branchNodes: string[] = [branchId];
      const queue = [branchId];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const kids = childrenMap.get(curr) ?? [];
        for (const kid of kids) {
          branchNodes.push(kid);
          queue.push(kid);
        }
      }

      const branchPositions = branchNodes.map(id => positions[id]).filter((p): p is { x: number; y: number } => Boolean(p));
      if (branchPositions.length === 0) continue;

      const minX = Math.min(...branchPositions.map(p => p.x));
      const maxX = Math.max(...branchPositions.map(p => p.x));
      const minY = Math.min(...branchPositions.map(p => p.y));
      const maxY = Math.max(...branchPositions.map(p => p.y));

      const branchRootNode = nodeMap.get(branchId);
      const tag = branchRootNode ? metrics.get(branchId)?.conceptTag || 'Sub-Concept' : 'Sub-Concept';

      clusters.push({
        id: `cluster-${branchId}`,
        label: tag,
        x: minX - 80,
        y: minY - 45,
        width: Math.max(160, maxX - minX + 160),
        height: Math.max(120, maxY - minY + 140),
        nodeCount: branchNodes.length,
      });
    }
  }

  return { positions, clusters };
}
