import { pairKey, type UndirectedGraph } from './graph';

/**
 * Bridges (edges whose removal disconnects the graph) and articulation points
 * (vertices whose removal does) via Tarjan's low-link DFS. In a learner's
 * concept graph these are the fragile spots: understanding of one area hangs
 * on a single connection.
 */
export function bridgesAndArticulationPoints(graph: UndirectedGraph): {
  bridges: Array<[string, string]>;
  articulationPoints: string[];
} {
  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const articulation = new Set<string>();
  const bridges: Array<[string, string]> = [];
  let time = 0;

  const visit = (u: string, parent: string | null) => {
    discovery.set(u, time);
    low.set(u, time);
    time += 1;
    let children = 0;
    for (const v of graph.neighbors(u)) {
      if (v === parent) continue;
      if (discovery.has(v)) {
        low.set(u, Math.min(low.get(u)!, discovery.get(v)!));
        continue;
      }
      children += 1;
      visit(v, u);
      low.set(u, Math.min(low.get(u)!, low.get(v)!));
      if (low.get(v)! > discovery.get(u)!) bridges.push(u < v ? [u, v] : [v, u]);
      if (parent !== null && low.get(v)! >= discovery.get(u)!) articulation.add(u);
    }
    if (parent === null && children > 1) articulation.add(u);
  };

  for (const id of graph.nodes()) if (!discovery.has(id)) visit(id, null);

  const unique = new Map(bridges.map((b) => [pairKey(b[0], b[1]), b]));
  return {
    bridges: [...unique.values()].sort((x, y) =>
      x[0] === y[0] ? x[1].localeCompare(y[1]) : x[0].localeCompare(y[0]),
    ),
    articulationPoints: [...articulation].sort(),
  };
}

/** Connected components, each sorted, ordered by smallest member. */
export function connectedComponents(graph: UndirectedGraph): string[][] {
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const start of graph.nodes()) {
    if (seen.has(start)) continue;
    const component: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const v = stack.pop()!;
      component.push(v);
      for (const w of graph.neighbors(v)) {
        if (seen.has(w)) continue;
        seen.add(w);
        stack.push(w);
      }
    }
    components.push(component.sort());
  }
  return components;
}
