import { describe, expect, it } from 'vitest';
import {
  UndirectedGraph,
  acceptAcyclic,
  adamicAdar,
  betweenness,
  bridgesAndArticulationPoints,
  computeMastery,
  connectedComponents,
  louvain,
  modularity,
  pageRank,
  topologicalOrder,
  wouldCreateCycle,
} from './index';

/** Two triangles joined by the single edge C–D (a "barbell"). */
function barbell(): UndirectedGraph {
  const g = new UndirectedGraph();
  for (const [a, b] of [
    ['A', 'B'],
    ['B', 'C'],
    ['A', 'C'],
    ['D', 'E'],
    ['E', 'F'],
    ['D', 'F'],
    ['C', 'D'],
  ] as const)
    g.addEdge(a, b);
  return g;
}

describe('UndirectedGraph', () => {
  it('accumulates weights, ignores self-loops and lists each edge once', () => {
    const g = new UndirectedGraph();
    g.addEdge('b', 'a', 0.5);
    g.addEdge('a', 'b', 0.25);
    g.addEdge('a', 'a', 1);
    expect(g.edges()).toEqual([['a', 'b', 0.75]]);
    expect(g.weightedDegree('a')).toBe(0.75);
  });
});

describe('louvain', () => {
  it('splits a barbell into its two triangles', () => {
    const partition = louvain(barbell());
    expect(Object.fromEntries(partition)).toEqual({ A: 0, B: 0, C: 0, D: 1, E: 1, F: 1 });
    expect(modularity(barbell(), partition)).toBeCloseTo(12 / 14 - 0.5, 6);
  });

  it('puts isolated vertices in their own communities and is deterministic', () => {
    const g = barbell();
    g.addNode('Z');
    expect(louvain(g).get('Z')).toBe(2);
    expect([...louvain(g)]).toEqual([...louvain(g)]);
  });

  it('handles an edgeless graph', () => {
    const g = new UndirectedGraph();
    g.addNode('x');
    g.addNode('y');
    expect(Object.fromEntries(louvain(g))).toEqual({ x: 0, y: 1 });
    expect(modularity(g, louvain(g))).toBe(0);
  });
});

describe('betweenness', () => {
  it('ranks the two bridge endpoints highest and leaves leaves at zero', () => {
    const bc = betweenness(barbell());
    expect(bc.get('C')).toBeCloseTo(0.6, 6);
    expect(bc.get('D')).toBeCloseTo(0.6, 6);
    expect(bc.get('A')).toBe(0);
  });

  it('gives the center of a star full betweenness', () => {
    const g = new UndirectedGraph();
    for (const leaf of ['a', 'b', 'c', 'd']) g.addEdge('hub', leaf);
    expect(betweenness(g).get('hub')).toBeCloseTo(1, 6);
  });
});

describe('pageRank', () => {
  it('sums to 1 and is symmetric on a symmetric graph', () => {
    const pr = pageRank(barbell());
    expect([...pr.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    expect(pr.get('A')).toBeCloseTo(pr.get('F')!, 8);
    expect(pr.get('C')!).toBeGreaterThan(pr.get('A')!);
  });

  it('personalization shifts importance toward the seed side', () => {
    const pr = pageRank(barbell(), { personalization: ['A'] });
    expect(pr.get('A')!).toBeGreaterThan(pr.get('F')!);
    expect(pr.get('B')!).toBeGreaterThan(pr.get('E')!);
  });

  it('keeps isolated vertices (dangling mass) without losing probability', () => {
    const g = barbell();
    g.addNode('Z');
    const pr = pageRank(g);
    expect([...pr.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });
});

describe('bridgesAndArticulationPoints', () => {
  it('finds the barbell bridge and its endpoints', () => {
    expect(bridgesAndArticulationPoints(barbell())).toEqual({
      bridges: [['C', 'D']],
      articulationPoints: ['C', 'D'],
    });
  });

  it('finds nothing in a cycle and every inner vertex of a path', () => {
    const cycle = new UndirectedGraph();
    for (const [a, b] of [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'a'],
    ] as const)
      cycle.addEdge(a, b);
    expect(bridgesAndArticulationPoints(cycle)).toEqual({ bridges: [], articulationPoints: [] });

    const path = new UndirectedGraph();
    for (const [a, b] of [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
    ] as const)
      path.addEdge(a, b);
    expect(bridgesAndArticulationPoints(path).articulationPoints).toEqual(['b', 'c']);
    expect(bridgesAndArticulationPoints(path).bridges).toHaveLength(3);
  });

  it('lists connected components', () => {
    const g = barbell();
    g.addEdge('Y', 'Z');
    expect(connectedComponents(g)).toEqual([
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['Y', 'Z'],
    ]);
  });
});

describe('adamicAdar', () => {
  it('proposes only non-adjacent pairs with common neighbours, best first', () => {
    const links = adamicAdar(barbell());
    expect(links.map((l) => `${l.sourceConceptId}-${l.targetConceptId}`)).toEqual([
      'A-D',
      'B-D',
      'C-E',
      'C-F',
    ]);
    expect(links[0]!.score).toBeCloseTo(1 / Math.log(3), 8);
    expect(links[0]!.commonNeighborIds).toEqual(['C']);
  });

  it('weights rare shared neighbours above hubs and honours exclusions', () => {
    const g = new UndirectedGraph();
    // x and y share rare r (degree 2) and hub h (degree 4).
    for (const [a, b] of [
      ['x', 'r'],
      ['y', 'r'],
      ['x', 'h'],
      ['y', 'h'],
      ['h', 'p'],
      ['h', 'q'],
    ] as const)
      g.addEdge(a, b);
    const links = adamicAdar(g, { topK: 50 });
    const score = (a: string, b: string) =>
      links.find((l) => l.sourceConceptId === a && l.targetConceptId === b)?.score;
    expect(score('x', 'y')).toBeCloseTo(1 / Math.log(2) + 1 / Math.log(4), 8);
    // p and x share only the hub, so they rank below x–y.
    expect(score('p', 'x')).toBeCloseTo(1 / Math.log(4), 8);
    expect(
      links.findIndex((l) => l.sourceConceptId === 'x' && l.targetConceptId === 'y'),
    ).toBeLessThan(links.findIndex((l) => l.sourceConceptId === 'p' && l.targetConceptId === 'x'));
    expect(
      adamicAdar(g, { exclude: new Set(['x|y']) }).some(
        (l) => l.sourceConceptId === 'x' && l.targetConceptId === 'y',
      ),
    ).toBe(false);
  });
});

describe('prerequisites', () => {
  const edges = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ];

  it('detects edges that would close a cycle', () => {
    expect(wouldCreateCycle(edges, 'c', 'a')).toBe(true);
    expect(wouldCreateCycle(edges, 'a', 'c')).toBe(false);
    expect(wouldCreateCycle(edges, 'x', 'x')).toBe(true);
  });

  it('accepts candidates greedily, checking against earlier accepted ones', () => {
    const { accepted, rejected } = acceptAcyclic(edges, [
      { from: 'c', to: 'd' },
      { from: 'd', to: 'a' },
      { from: 'a', to: 'd' },
    ]);
    expect(accepted).toEqual([
      { from: 'c', to: 'd' },
      { from: 'a', to: 'd' },
    ]);
    expect(rejected).toEqual([{ from: 'd', to: 'a' }]);
  });

  it('orders topologically and reports cyclic leftovers', () => {
    expect(topologicalOrder(['z'], edges)).toEqual({ order: ['a', 'b', 'c', 'z'], cyclic: [] });
    expect(topologicalOrder([], [...edges, { from: 'c', to: 'a' }])).toEqual({
      order: [],
      cyclic: ['a', 'b', 'c'],
    });
  });
});

describe('computeMastery', () => {
  it('derives status from trap evidence before exposure', () => {
    const mastery = computeMastery(
      ['m', 'x', 'e', 'u'],
      [
        { conceptId: 'm', role: 'defines', weight: 1, trap: 'resolved' },
        { conceptId: 'x', role: 'misconceives', weight: 1, trap: 'unresolved' },
        { conceptId: 'x', role: 'defines', weight: 1, trap: 'resolved' },
        { conceptId: 'e', role: 'defines', weight: 1, trap: 'none' },
        { conceptId: 'e', role: 'defines', weight: 1, trap: 'none' },
      ],
      [],
    );
    expect(mastery.get('m')).toEqual({ score: 1, status: 'mastered', inferred: false });
    expect(mastery.get('x')?.status).toBe('misconception');
    expect(mastery.get('e')).toEqual({ score: 0.64, status: 'explored', inferred: false });
    expect(mastery.get('u')).toEqual({ score: 0, status: 'untouched', inferred: false });
  });

  it('caps exposure without a trap below mastery', () => {
    const many = Array.from({ length: 20 }, () => ({
      conceptId: 'e',
      role: 'defines' as const,
      weight: 1,
      trap: 'none' as const,
    }));
    expect(computeMastery(['e'], many, []).get('e')).toEqual({
      score: 0.75,
      status: 'explored',
      inferred: false,
    });
  });

  it('propagates decaying credit to prerequisites only, never to dependents or misconceptions', () => {
    const mastery = computeMastery(
      ['p2', 'p1', 'c', 'dep', 'bad'],
      [
        { conceptId: 'c', role: 'defines', weight: 1, trap: 'resolved' },
        { conceptId: 'bad', role: 'uses', weight: 1, trap: 'unresolved' },
      ],
      [
        { from: 'p1', to: 'c' },
        { from: 'p2', to: 'p1' },
        { from: 'c', to: 'dep' },
        { from: 'bad', to: 'c' },
      ],
    );
    expect(mastery.get('p1')).toEqual({ score: 0.5, status: 'explored', inferred: true });
    expect(mastery.get('p2')).toEqual({ score: 0.25, status: 'touched', inferred: true });
    expect(mastery.get('dep')?.score).toBe(0);
    expect(mastery.get('bad')?.status).toBe('misconception');
  });
});
