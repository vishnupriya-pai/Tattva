import type { UndirectedGraph } from './graph';

/**
 * Brandes betweenness centrality (unweighted shortest paths), normalized to
 * [0, 1] for undirected graphs. High betweenness = a concept that sits on many
 * shortest paths between other concepts: a "keystone" bridging topic areas.
 */
export function betweenness(graph: UndirectedGraph): Map<string, number> {
  const ids = graph.nodes();
  const score = new Map(ids.map((id) => [id, 0]));

  for (const s of ids) {
    const stack: string[] = [];
    const predecessors = new Map<string, string[]>(ids.map((id) => [id, []]));
    const sigma = new Map(ids.map((id) => [id, 0]));
    const dist = new Map(ids.map((id) => [id, -1]));
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue = [s];
    for (let head = 0; head < queue.length; head += 1) {
      const v = queue[head]!;
      stack.push(v);
      for (const w of graph.neighbors(v)) {
        if (dist.get(w)! < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          predecessors.get(w)!.push(v);
        }
      }
    }
    const delta = new Map(ids.map((id) => [id, 0]));
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of predecessors.get(w)!) {
        delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      }
      if (w !== s) score.set(w, score.get(w)! + delta.get(w)!);
    }
  }

  const n = ids.length;
  // Each pair is counted from both endpoints in an undirected graph.
  const norm = n > 2 ? (n - 1) * (n - 2) : 1;
  for (const id of ids) score.set(id, score.get(id)! / norm);
  return score;
}

/**
 * Weighted PageRank, optionally personalized: teleports land on
 * `personalization` vertices instead of uniformly, so importance is measured
 * relative to the inquiry's root question rather than globally.
 */
export function pageRank(
  graph: UndirectedGraph,
  options: {
    damping?: number;
    personalization?: Iterable<string>;
    maxIterations?: number;
    tolerance?: number;
  } = {},
): Map<string, number> {
  const ids = graph.nodes();
  const n = ids.length;
  const result = new Map<string, number>();
  if (n === 0) return result;

  const damping = options.damping ?? 0.85;
  const personal = [...(options.personalization ?? [])].filter((id) => graph.hasNode(id));
  const teleport = new Map(ids.map((id) => [id, personal.length ? 0 : 1 / n]));
  for (const id of personal) teleport.set(id, 1 / personal.length);

  let rank = new Map(teleport);
  const strength = new Map(ids.map((id) => [id, graph.weightedDegree(id)]));

  for (let iter = 0; iter < (options.maxIterations ?? 200); iter += 1) {
    let dangling = 0;
    for (const id of ids) if (strength.get(id) === 0) dangling += rank.get(id)!;
    const next = new Map<string, number>();
    for (const id of ids) {
      let incoming = 0;
      for (const nb of graph.neighbors(id))
        incoming += (rank.get(nb)! * graph.weight(id, nb)) / strength.get(nb)!;
      next.set(
        id,
        (1 - damping) * teleport.get(id)! + damping * (incoming + dangling * teleport.get(id)!),
      );
    }
    let diff = 0;
    for (const id of ids) diff += Math.abs(next.get(id)! - rank.get(id)!);
    rank = next;
    if (diff < (options.tolerance ?? 1e-10)) break;
  }

  for (const id of ids) result.set(id, rank.get(id)!);
  return result;
}
