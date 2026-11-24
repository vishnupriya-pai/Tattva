import type { UndirectedGraph } from './graph';

export interface PredictedLink {
  sourceConceptId: string;
  targetConceptId: string;
  /** Adamic–Adar score: Σ 1/ln(deg(z)) over common neighbours z. */
  score: number;
  commonNeighborIds: string[];
}

/**
 * Adamic–Adar link prediction (Adamic & Adar, 2003): two concepts that are not
 * yet connected but share neighbours are likely related, and a shared
 * neighbour counts for more when it is itself rare (low degree). Hub concepts
 * that touch everything contribute little.
 *
 * `exclude` holds pair keys already decided (e.g. previously rejected by the
 * verifier) so they are not proposed again.
 */
export function adamicAdar(
  graph: UndirectedGraph,
  options: { topK?: number; minScore?: number; exclude?: ReadonlySet<string> } = {},
): PredictedLink[] {
  const ids = graph.nodes();
  const out: PredictedLink[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    const a = ids[i]!;
    const aNeighbors = new Set(graph.neighbors(a));
    for (let j = i + 1; j < ids.length; j += 1) {
      const b = ids[j]!;
      if (aNeighbors.has(b) || options.exclude?.has(`${a}|${b}`)) continue;
      const common = graph.neighbors(b).filter((z) => aNeighbors.has(z));
      if (common.length === 0) continue;
      // Common neighbours have degree >= 2 by construction, so ln(deg) > 0.
      const score = common.reduce((s, z) => s + 1 / Math.log(graph.degree(z)), 0);
      if (score < (options.minScore ?? 0)) continue;
      out.push({ sourceConceptId: a, targetConceptId: b, score, commonNeighborIds: common });
    }
  }
  out.sort(
    (x, y) =>
      y.score - x.score ||
      x.sourceConceptId.localeCompare(y.sourceConceptId) ||
      x.targetConceptId.localeCompare(y.targetConceptId),
  );
  return out.slice(0, options.topK ?? 10);
}
