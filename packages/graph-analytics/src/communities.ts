import type { UndirectedGraph } from './graph';

/**
 * Louvain community detection (Blondel et al., 2008) on a weighted undirected
 * graph. Deterministic: vertices are visited in sorted order and ties keep the
 * current community, so the same graph always yields the same partition.
 *
 * Returns community index per vertex, numbered 0..k-1 in order of each
 * community's smallest member id.
 */
export function louvain(graph: UndirectedGraph, maxLevels = 10): Map<string, number> {
  const ids = graph.nodes();
  const result = new Map<string, number>();
  if (ids.length === 0) return result;

  // Level-0 representation: indexed adjacency plus self-loop weights.
  let adjacency: Array<Map<number, number>> = ids.map(() => new Map());
  let selfLoops: number[] = ids.map(() => 0);
  const index = new Map(ids.map((id, i) => [id, i]));
  for (const [a, b, w] of graph.edges()) {
    adjacency[index.get(a)!]!.set(index.get(b)!, w);
    adjacency[index.get(b)!]!.set(index.get(a)!, w);
  }
  // membership[original vertex] = current super-node.
  let membership = ids.map((_, i) => i);

  for (let level = 0; level < maxLevels; level += 1) {
    const n = adjacency.length;
    const k = adjacency.map((nbrs, i) => {
      let s = 2 * selfLoops[i]!;
      for (const w of nbrs.values()) s += w;
      return s;
    });
    const m2 = k.reduce((a, b) => a + b, 0);
    if (m2 === 0) break;

    const community = Array.from({ length: n }, (_, i) => i);
    const tot = k.slice();
    let movedAny = false;

    for (let pass = 0; pass < 100; pass += 1) {
      let moved = false;
      for (let i = 0; i < n; i += 1) {
        const current = community[i]!;
        tot[current]! -= k[i]!;
        const linkTo = new Map<number, number>();
        for (const [j, w] of adjacency[i]!)
          linkTo.set(community[j]!, (linkTo.get(community[j]!) ?? 0) + w);

        let best = current;
        let bestGain = (linkTo.get(current) ?? 0) - (tot[current]! * k[i]!) / m2;
        for (const c of [...linkTo.keys()].sort((a, b) => a - b)) {
          const gain = linkTo.get(c)! - (tot[c]! * k[i]!) / m2;
          if (gain > bestGain + 1e-12) {
            best = c;
            bestGain = gain;
          }
        }
        tot[best]! += k[i]!;
        if (best !== current) {
          community[i] = best;
          moved = true;
          movedAny = true;
        }
      }
      if (!moved) break;
    }
    if (!movedAny) break;

    // Renumber communities densely and aggregate into super-nodes.
    const renumber = new Map<number, number>();
    for (const c of community) if (!renumber.has(c)) renumber.set(c, renumber.size);
    const nextAdjacency: Array<Map<number, number>> = Array.from(
      { length: renumber.size },
      () => new Map(),
    );
    const nextSelf: number[] = Array.from({ length: renumber.size }, () => 0);
    for (let i = 0; i < n; i += 1) {
      const ci = renumber.get(community[i]!)!;
      nextSelf[ci]! += selfLoops[i]!;
      for (const [j, w] of adjacency[i]!) {
        if (j < i) continue; // each undirected pair once
        const cj = renumber.get(community[j]!)!;
        if (ci === cj) nextSelf[ci]! += w;
        else {
          nextAdjacency[ci]!.set(cj, (nextAdjacency[ci]!.get(cj) ?? 0) + w);
          nextAdjacency[cj]!.set(ci, (nextAdjacency[cj]!.get(ci) ?? 0) + w);
        }
      }
    }
    membership = membership.map((superNode) => renumber.get(community[superNode]!)!);
    adjacency = nextAdjacency;
    selfLoops = nextSelf;
  }

  // Final numbering: by each community's smallest member id (ids are sorted).
  const finalNumber = new Map<number, number>();
  ids.forEach((id, i) => {
    const c = membership[i]!;
    if (!finalNumber.has(c)) finalNumber.set(c, finalNumber.size);
    result.set(id, finalNumber.get(c)!);
  });
  return result;
}

/** Newman modularity Q of a partition; 0 for an edgeless graph. */
export function modularity(graph: UndirectedGraph, partition: ReadonlyMap<string, number>): number {
  const m2 = graph.nodes().reduce((s, id) => s + graph.weightedDegree(id), 0);
  if (m2 === 0) return 0;
  let internal = 0;
  const totals = new Map<number, number>();
  for (const id of graph.nodes()) {
    const c = partition.get(id)!;
    totals.set(c, (totals.get(c) ?? 0) + graph.weightedDegree(id));
  }
  for (const [a, b, w] of graph.edges())
    if (partition.get(a) === partition.get(b)) internal += 2 * w;
  let expected = 0;
  for (const t of totals.values()) expected += (t / m2) ** 2;
  return internal / m2 - expected;
}
