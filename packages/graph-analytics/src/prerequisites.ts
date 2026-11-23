/**
 * The PREREQUISITE_OF sub-graph must stay a DAG: "A is a prerequisite of B" and
 * "B is a prerequisite of A" together are meaningless. Edges point from the
 * prerequisite to the dependent concept.
 */
export interface DirectedEdge {
  from: string;
  to: string;
}

function successors(edges: readonly DirectedEdge[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const { from, to } of edges) {
    const list = out.get(from) ?? [];
    list.push(to);
    out.set(from, list);
  }
  return out;
}

/** True if adding from→to would close a cycle (i.e. `to` already reaches `from`), or is a self-loop. */
export function wouldCreateCycle(
  edges: readonly DirectedEdge[],
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  const next = successors(edges);
  const seen = new Set<string>([to]);
  const stack = [to];
  while (stack.length) {
    const v = stack.pop()!;
    for (const w of next.get(v) ?? []) {
      if (w === from) return true;
      if (!seen.has(w)) {
        seen.add(w);
        stack.push(w);
      }
    }
  }
  return false;
}

/**
 * Adds candidate edges one at a time, skipping any that would create a cycle
 * with the existing edges or with candidates accepted before it.
 */
export function acceptAcyclic<T extends DirectedEdge>(
  existing: readonly DirectedEdge[],
  candidates: readonly T[],
): { accepted: T[]; rejected: T[] } {
  const current: DirectedEdge[] = [...existing];
  const accepted: T[] = [];
  const rejected: T[] = [];
  for (const edge of candidates) {
    if (wouldCreateCycle(current, edge.from, edge.to)) rejected.push(edge);
    else {
      accepted.push(edge);
      current.push(edge);
    }
  }
  return { accepted, rejected };
}

/**
 * Kahn's algorithm with a sorted ready-queue (deterministic). Vertices left
 * over are on or downstream of a cycle; they are returned separately rather
 * than silently dropped.
 */
export function topologicalOrder(
  vertices: Iterable<string>,
  edges: readonly DirectedEdge[],
): { order: string[]; cyclic: string[] } {
  const all = new Set(vertices);
  for (const e of edges) {
    all.add(e.from);
    all.add(e.to);
  }
  const indegree = new Map([...all].map((v) => [v, 0]));
  for (const e of edges) indegree.set(e.to, indegree.get(e.to)! + 1);
  const next = successors(edges);
  const ready = [...all].filter((v) => indegree.get(v) === 0).sort();
  const order: string[] = [];
  while (ready.length) {
    const v = ready.shift()!;
    order.push(v);
    for (const w of (next.get(v) ?? []).slice().sort()) {
      indegree.set(w, indegree.get(w)! - 1);
      if (indegree.get(w) === 0) {
        ready.push(w);
        ready.sort();
      }
    }
  }
  const placed = new Set(order);
  return { order, cyclic: [...all].filter((v) => !placed.has(v)).sort() };
}
