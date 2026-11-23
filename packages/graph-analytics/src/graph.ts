/**
 * Minimal weighted undirected graph used by every algorithm in this package.
 * Vertices are string ids; iteration order is always sorted so results are
 * deterministic across runs, browsers and the server.
 */
export class UndirectedGraph {
  private readonly adjacency = new Map<string, Map<string, number>>();

  addNode(id: string): void {
    if (!this.adjacency.has(id)) this.adjacency.set(id, new Map());
  }

  /** Adds `weight` to the edge a–b (creating it). Self-loops are ignored. */
  addEdge(a: string, b: string, weight = 1): void {
    if (a === b || weight <= 0) return;
    this.addNode(a);
    this.addNode(b);
    const ab = this.adjacency.get(a)!;
    const ba = this.adjacency.get(b)!;
    ab.set(b, (ab.get(b) ?? 0) + weight);
    ba.set(a, (ba.get(a) ?? 0) + weight);
  }

  hasNode(id: string): boolean {
    return this.adjacency.has(id);
  }

  hasEdge(a: string, b: string): boolean {
    return this.adjacency.get(a)?.has(b) ?? false;
  }

  weight(a: string, b: string): number {
    return this.adjacency.get(a)?.get(b) ?? 0;
  }

  nodes(): string[] {
    return [...this.adjacency.keys()].sort();
  }

  /** Neighbours of `id`, sorted. */
  neighbors(id: string): string[] {
    return [...(this.adjacency.get(id)?.keys() ?? [])].sort();
  }

  degree(id: string): number {
    return this.adjacency.get(id)?.size ?? 0;
  }

  weightedDegree(id: string): number {
    let total = 0;
    for (const w of this.adjacency.get(id)?.values() ?? []) total += w;
    return total;
  }

  get size(): number {
    return this.adjacency.size;
  }

  /** Each undirected edge once, as [a, b, weight] with a < b, sorted. */
  edges(): Array<[string, string, number]> {
    const out: Array<[string, string, number]> = [];
    for (const a of this.nodes()) {
      for (const b of this.neighbors(a)) if (a < b) out.push([a, b, this.weight(a, b)]);
    }
    return out;
  }
}

/** Stable key for an unordered pair. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
