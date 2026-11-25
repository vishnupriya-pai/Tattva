import { describe, expect, it } from 'vitest';
import {
  dropCyclicPrerequisites,
  MAX_CONCEPTS_PER_NODE,
  parseConceptExtraction,
  findDuplicateConcepts,
  resolveAgainstKnown,
  slugifyConcept,
} from './conceptExtraction';

describe('slugifyConcept', () => {
  it('collapses case, punctuation, hyphens and a plural last word', () => {
    expect(slugifyConcept('Bump Pointers')).toBe('bump-pointer');
    expect(slugifyConcept('bump-pointer')).toBe('bump-pointer');
    expect(slugifyConcept('  Free  List! ')).toBe('free-list');
  });

  it('keeps words that only look plural and technical symbols', () => {
    expect(slugifyConcept('Address')).toBe('address');
    expect(slugifyConcept('Memory Bus')).toBe('memory-bus');
    expect(slugifyConcept('C++ RAII')).toBe('c++-raii');
    expect(slugifyConcept('Cache Entries')).toBe('cache-entry');
    expect(slugifyConcept('Learner’s Model')).toBe('learners-model');
  });

  it('returns empty for names with no alphanumerics', () => {
    expect(slugifyConcept(' -- ')).toBe('');
  });
});

describe('parseConceptExtraction', () => {
  it('returns an empty extraction for non-object or missing payloads', () => {
    expect(parseConceptExtraction(null)).toEqual({ concepts: [], relations: [] });
    expect(parseConceptExtraction({ explanation: 'x' })).toEqual({ concepts: [], relations: [] });
    expect(parseConceptExtraction({ concepts: 'nope', relations: {} })).toEqual({
      concepts: [],
      relations: [],
    });
  });

  it('keeps valid items, defaults bad roles/weights, and drops junk', () => {
    const result = parseConceptExtraction({
      concepts: [
        { name: 'Bump Pointer', role: 'defines', weight: 0.9 },
        { name: 'Fragmentation', role: 'bogus', weight: 'high' },
        { name: '', role: 'uses', weight: 1 },
        42,
        'Object Lifetime',
      ],
    });
    expect(result.concepts).toEqual([
      { name: 'Bump Pointer', slug: 'bump-pointer', role: 'defines', weight: 0.9 },
      { name: 'Fragmentation', slug: 'fragmentation', role: 'uses', weight: 0.5 },
      { name: 'Object Lifetime', slug: 'object-lifetime', role: 'uses', weight: 0.5 },
    ]);
  });

  it('dedupes by slug keeping the heavier mention, and caps the count', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `Concept ${String.fromCharCode(97 + i)}`,
      weight: i / 10,
    }));
    const result = parseConceptExtraction({
      concepts: [
        { name: 'Bump Pointers', weight: 0.2 },
        { name: 'bump pointer', weight: 0.8 },
        ...many,
      ],
    });
    expect(result.concepts).toHaveLength(MAX_CONCEPTS_PER_NODE);
    expect(result.concepts.filter((c) => c.slug === 'bump-pointer')).toEqual([
      { name: 'bump pointer', slug: 'bump-pointer', role: 'uses', weight: 0.8 },
    ]);
    // Heaviest first: the lightest generic concepts are the ones cut by the cap.
    expect(result.concepts.map((c) => c.weight)).toEqual([0.9, 0.8, 0.8, 0.7, 0.6, 0.5]);
  });

  it('accepts relations between this node or known concepts only, normalizing type', () => {
    const result = parseConceptExtraction(
      {
        concepts: [{ name: 'Bump Pointer' }, { name: 'Per-Object Metadata' }],
        relations: [
          {
            from: 'Per-Object Metadata',
            type: 'trades off with',
            to: 'Bump Pointer',
            why: '  Metadata costs\nspeed. ',
          },
          { from: 'Bump Pointer', type: 'PREREQUISITE_OF', to: 'Fragmentation', why: 'known' },
          { from: 'Bump Pointer', type: 'CAUSES', to: 'Unknown Thing', why: 'x' },
          { from: 'Bump Pointer', type: 'RELATED_TO', to: 'Per-Object Metadata', why: 'bad type' },
          { from: 'Bump Pointer', type: 'CAUSES', to: 'bump pointers', why: 'self loop' },
          {
            from: 'Per-Object Metadata',
            type: 'TRADES_OFF_WITH',
            to: 'Bump Pointer',
            why: 'duplicate',
          },
        ],
      },
      ['fragmentation'],
    );
    expect(result.relations).toEqual([
      {
        fromSlug: 'per-object-metadata',
        toSlug: 'bump-pointer',
        type: 'TRADES_OFF_WITH',
        justification: 'Metadata costs speed.',
      },
      {
        fromSlug: 'bump-pointer',
        toSlug: 'fragmentation',
        type: 'PREREQUISITE_OF',
        justification: 'known',
      },
    ]);
  });
});

describe('resolveAgainstKnown', () => {
  it('rewrites alias matches to the canonical slug and merges duplicates', () => {
    const extraction = {
      concepts: [
        { name: 'Bump Allocation', slug: 'bump-allocation', role: 'uses' as const, weight: 0.4 },
        { name: 'Bump Pointer', slug: 'bump-pointer', role: 'defines' as const, weight: 0.9 },
        { name: 'Arena Reset', slug: 'arena-reset', role: 'uses' as const, weight: 0.5 },
      ],
      relations: [
        {
          fromSlug: 'bump-allocation',
          toSlug: 'arena-reset',
          type: 'CAUSES' as const,
          justification: 'a',
        },
        {
          fromSlug: 'bump-allocation',
          toSlug: 'bump-pointer',
          type: 'GENERALIZES' as const,
          justification: 'becomes self loop',
        },
      ],
    };
    const result = resolveAgainstKnown(extraction, [
      { name: 'Bump Pointer', slug: 'bump-pointer', aliases: ['Bump Allocation'] },
    ]);
    expect(result.concepts.map((c) => [c.slug, c.weight])).toEqual([
      ['bump-pointer', 0.9],
      ['arena-reset', 0.5],
    ]);
    expect(result.relations).toEqual([
      { fromSlug: 'bump-pointer', toSlug: 'arena-reset', type: 'CAUSES', justification: 'a' },
    ]);
  });

  const KNOWN = [
    { name: 'Translation Lookaside Buffer', slug: 'translation-lookaside-buffer', aliases: [] },
    { name: 'TLB Miss', slug: 'tlb-miss', aliases: [] },
    { name: 'Object Lifetime Correlation', slug: 'object-lifetime-correlation', aliases: [] },
    { name: 'Page Frame', slug: 'page-frame', aliases: [] },
    { name: 'Internal Fragmentation', slug: 'internal-fragmentation', aliases: [] },
  ];
  const resolveOne = (name: string) =>
    resolveAgainstKnown(
      { concepts: [{ name, slug: slugifyConcept(name), role: 'uses', weight: 0.5 }], relations: [] },
      KNOWN,
    ).concepts[0]!;

  it('matches acronyms both ways, also inside longer phrases, and keeps the new wording as the name', () => {
    expect(resolveOne('TLB')).toEqual({ name: 'TLB', slug: 'translation-lookaside-buffer', role: 'uses', weight: 0.5 });
    expect(resolveOne('TLBs').slug).toBe('translation-lookaside-buffer');
    expect(resolveOne('Translation Lookaside Buffer Miss').slug).toBe('tlb-miss');
  });

  it('matches reordered and pluralised wordings', () => {
    expect(resolveOne('Correlation of Object Lifetimes').slug).toBe('object-lifetime-correlation');
  });

  it('does not merge different concepts that share words or initials', () => {
    expect(resolveOne('Page Table').slug).toBe('page-table');
    expect(resolveOne('External Fragmentation').slug).toBe('external-fragmentation');
    expect(resolveOne('Page Fault').slug).toBe('page-fault');
    expect(resolveOne('Thrashing').slug).toBe('thrashing');
  });

  it('finds duplicates among existing concepts, mapping later ones to the oldest', () => {
    expect(
      findDuplicateConcepts([
        ...KNOWN,
        { name: 'TLB', slug: 'tlb', aliases: [] },
        { name: 'Page Table', slug: 'page-table', aliases: [] },
        { name: 'Correlation of Object Lifetimes', slug: 'correlation-of-object-lifetime', aliases: [] },
      ]),
    ).toEqual([
      { duplicate: 'tlb', canonical: 'translation-lookaside-buffer' },
      { duplicate: 'correlation-of-object-lifetime', canonical: 'object-lifetime-correlation' },
    ]);
  });

  it('applies the same resolution to relation endpoints', () => {
    const result = resolveAgainstKnown(
      {
        concepts: [{ name: 'TLB', slug: 'tlb', role: 'defines', weight: 0.9 }],
        relations: [{ fromSlug: 'tlb', toSlug: 'internal-fragmentation', type: 'CAUSES', justification: '' }],
      },
      KNOWN,
    );
    expect(result.relations[0]).toMatchObject({ fromSlug: 'translation-lookaside-buffer' });
  });
});

describe('dropCyclicPrerequisites', () => {
  const graph = {
    concepts: [
      { id: 'id-a', name: 'A', slug: 'a', aliases: [], createdAt: '0' },
      { id: 'id-b', name: 'B', slug: 'b', aliases: [], createdAt: '0' },
    ],
    nodeConcepts: [],
    conceptEdges: [
      {
        id: 'e', sourceConceptId: 'id-a', targetConceptId: 'id-b', relationType: 'PREREQUISITE_OF' as const,
        justification: '', origin: 'model' as const, confidence: 0.6, sourceNodeId: null, createdAt: '0',
      },
    ],
  };

  it('drops prerequisites that close a cycle, within the batch too, and keeps other types', () => {
    const relations = [
      { fromSlug: 'b', toSlug: 'a', type: 'PREREQUISITE_OF' as const, justification: 'cycle with stored a→b' },
      { fromSlug: 'b', toSlug: 'c', type: 'PREREQUISITE_OF' as const, justification: 'fine' },
      { fromSlug: 'c', toSlug: 'a', type: 'PREREQUISITE_OF' as const, justification: 'cycle a→b→c→a' },
      { fromSlug: 'b', toSlug: 'a', type: 'CONTRASTS_WITH' as const, justification: 'not a prerequisite' },
    ];
    const result = dropCyclicPrerequisites({ concepts: [], relations }, graph);
    expect(result.relations.map((r) => r.justification)).toEqual(['fine', 'not a prerequisite']);
  });
});
