import { describe, expect, it } from 'vitest';
import {
  buildConceptPromptContext,
  buildCrossBranchDigest,
  buildGraphContext,
  CROSS_BRANCH_CHAR_CAP,
  CROSS_BRANCH_MAX_ENTRIES,
  formatGraphContext,
  GraphContextError,
  OLDER_ANCESTRY_SUMMARY_CHAR_CAP,
  VERBATIM_EXPLANATION_CHAR_CAP,
} from './graphContext';

function node(id: string, parentNodeId: string | null, explanation = `A-${id}`) {
  return { id, parentNodeId, userQuestion: `Q-${id}`, aiExplanation: explanation };
}

/** n0 <- n1 <- … <- n(len-1) */
function chainOf(length: number) {
  return Array.from({ length }, (_, i) => node(`n${i}`, i === 0 ? null : `n${i - 1}`));
}

describe('buildGraphContext', () => {
  it('returns empty context for a root question', () => {
    expect(buildGraphContext(chainOf(3), null)).toEqual({
      depth: 0, parent: null, grandparent: null, olderAncestrySummary: null,
    });
  });

  it('includes only the parent for a child of the root', () => {
    const ctx = buildGraphContext(chainOf(1), 'n0');
    expect(ctx.depth).toBe(1);
    expect(ctx.parent).toEqual({ nodeId: 'n0', question: 'Q-n0', explanation: 'A-n0' });
    expect(ctx.grandparent).toBeNull();
    expect(ctx.olderAncestrySummary).toBeNull();
  });

  it('includes parent and grandparent for a grandchild', () => {
    const ctx = buildGraphContext(chainOf(2), 'n1');
    expect(ctx.depth).toBe(2);
    expect(ctx.parent?.nodeId).toBe('n1');
    expect(ctx.grandparent?.nodeId).toBe('n0');
    expect(ctx.olderAncestrySummary).toBeNull();
  });

  it('ignores sibling branches and follows only the real ancestry', () => {
    const nodes = [...chainOf(2), node('sibling', 'n0')];
    const ctx = buildGraphContext(nodes, 'sibling');
    expect(ctx.parent?.nodeId).toBe('sibling');
    expect(ctx.grandparent?.nodeId).toBe('n0');
  });

  it('summarizes older ancestry oldest-first and keeps it bounded', () => {
    const ctx = buildGraphContext(chainOf(30), 'n29');
    expect(ctx.depth).toBe(30);
    expect(ctx.parent?.nodeId).toBe('n29');
    expect(ctx.grandparent?.nodeId).toBe('n28');
    expect(ctx.olderAncestrySummary?.startsWith('Q: Q-n0 A: A-n0')).toBe(true);
    expect(ctx.olderAncestrySummary).not.toContain('Q-n28');
    expect(ctx.olderAncestrySummary!.length).toBeLessThanOrEqual(OLDER_ANCESTRY_SUMMARY_CHAR_CAP);
  });

  it('truncates long verbatim explanations', () => {
    const ctx = buildGraphContext([node('n0', null, 'x'.repeat(5000))], 'n0');
    expect(ctx.parent!.explanation.length).toBe(VERBATIM_EXPLANATION_CHAR_CAP);
    expect(ctx.parent!.explanation.endsWith('…')).toBe(true);
  });

  it('fails loudly on cyclic ancestry', () => {
    const nodes = [node('a', 'b'), node('b', 'a')];
    expect(() => buildGraphContext(nodes, 'a')).toThrow(GraphContextError);
  });

  it('fails loudly when an ancestor is not part of the inquiry', () => {
    expect(() => buildGraphContext([node('a', 'missing')], 'a')).toThrow(GraphContextError);
  });
});

describe('formatGraphContext', () => {
  it('renders nothing for a root question', () => {
    expect(formatGraphContext(buildGraphContext([], null))).toBe('');
  });

  it('renders older → grandparent → parent → selected follow-up in order', () => {
    const text = formatGraphContext(buildGraphContext(chainOf(4), 'n3'), 'Why does it fragment?');
    const order = ['EARLIER CONTEXT', 'GRANDPARENT QUESTION: Q-n2', 'PARENT QUESTION: Q-n3', 'SELECTED THIS FOLLOW-UP: Why does it fragment?'];
    const positions = order.map((label) => text.indexOf(label));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

describe('buildCrossBranchDigest', () => {
  // r ─┬─ a ── a2
  //    └─ b ── b2
  const tree = [
    { ...node('r', null), createdAt: '1' },
    { ...node('a', 'r'), createdAt: '2' },
    { ...node('b', 'r'), createdAt: '3' },
    { ...node('a2', 'a'), createdAt: '4' },
    { ...node('b2', 'b'), createdAt: '5' },
  ];

  it('lists only nodes outside the new node’s ancestry, newest first, with concepts', () => {
    const digest = buildCrossBranchDigest(tree, 'a2', new Map([['b', ['Free List', 'Fragmentation']]]));
    expect(digest.split('\n')).toEqual(['- Q: Q-b2', '- Q: Q-b [concepts: Free List, Fragmentation]']);
  });

  it('includes every node for a root question and nothing for an empty inquiry', () => {
    expect(buildCrossBranchDigest(tree, null).split('\n')).toHaveLength(5);
    expect(buildCrossBranchDigest([], null)).toBe('');
  });

  it('stays within the entry and character caps', () => {
    const wide = Array.from({ length: 40 }, (_, i) => ({ ...node(`w${i}`, null), userQuestion: 'q'.repeat(300), createdAt: String(i) }));
    const digest = buildCrossBranchDigest(wide, null);
    expect(digest.split('\n').length).toBeLessThanOrEqual(CROSS_BRANCH_MAX_ENTRIES);
    expect(digest.length).toBeLessThanOrEqual(CROSS_BRANCH_CHAR_CAP);
  });

  it('terminates on cyclic ancestry', () => {
    expect(buildCrossBranchDigest([node('x', 'y'), node('y', 'x'), node('z', null)], 'x')).toBe('- Q: Q-z');
  });
});

describe('buildConceptPromptContext', () => {
  const C1 = '00000000-0000-4000-8000-0000000000c1';
  const C2 = '00000000-0000-4000-8000-0000000000c2';
  const graph = {
    concepts: [
      { id: C1, name: 'Bump Pointer', slug: 'bump-pointer', aliases: ['Bump Allocation'], createdAt: '1' },
      { id: C2, name: 'Free List', slug: 'free-list', aliases: [], createdAt: '2' },
    ],
    nodeConcepts: [
      { questionNodeId: 'b', conceptId: C2, role: 'defines' as const, weight: 0.9 },
      { questionNodeId: 'r', conceptId: C2, role: 'uses' as const, weight: 0.3 },
      { questionNodeId: 'b', conceptId: C1, role: 'uses' as const, weight: 0.4 },
    ],
    conceptEdges: [],
  };

  it('ranks known concepts by degree and exposes alias slugs for relation resolution', () => {
    const ctx = buildConceptPromptContext([node('r', null), node('a', 'r'), node('b', 'r')], 'a', graph);
    expect(ctx.knownConcepts).toBe('Free List; Bump Pointer');
    expect(ctx.knownConceptSlugs.sort()).toEqual(['bump-allocation', 'bump-pointer', 'free-list']);
    expect(ctx.otherBranches).toBe('- Q: Q-b [concepts: Free List, Bump Pointer]');
  });

  it('is empty for an inquiry with no concepts yet', () => {
    const ctx = buildConceptPromptContext([], null, { concepts: [], nodeConcepts: [], conceptEdges: [] });
    expect(ctx).toEqual({ otherBranches: '', knownConcepts: '', knownConceptSlugs: [], known: [] });
  });
});
