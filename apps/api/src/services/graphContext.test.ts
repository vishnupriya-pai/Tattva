import { describe, expect, it } from 'vitest';
import {
  buildGraphContext,
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
