import {
  CONCEPT_RELATION_TYPES,
  CONCEPT_ROLES,
  type ConceptRelationType,
  type ConceptRole,
  type ConceptGraph,
} from '@tattva/contracts';
import { acceptAcyclic } from '@tattva/graph-analytics';

/**
 * Concept extraction post-processing (docs/INTELLIGENCE_ARCHITECTURE.md §12).
 *
 * Pure and side-effect free. Model output is untrusted: every item is
 * validated on its own and malformed items are dropped. Concept extraction is
 * enrichment, so a bad CONCEPTS block must never fail node creation.
 */

export const MAX_CONCEPTS_PER_NODE = 6;
export const MAX_RELATIONS_PER_NODE = 6;
const MAX_CONCEPT_NAME_CHARS = 60;
const MAX_JUSTIFICATION_CHARS = 240;
/** Words that stay as written when singularizing, e.g. "bus", "analysis", "address". */
const SINGULAR_ENDINGS = ['ss', 'us', 'is', 'os', 'xs'];

export interface ExtractedConcept {
  name: string;
  slug: string;
  role: ConceptRole;
  weight: number;
}

export interface ExtractedRelation {
  fromSlug: string;
  toSlug: string;
  type: ConceptRelationType;
  justification: string;
}

export interface ConceptExtraction {
  concepts: ExtractedConcept[];
  relations: ExtractedRelation[];
}

export const EMPTY_EXTRACTION: ConceptExtraction = { concepts: [], relations: [] };

function singularize(word: string): string {
  if (word.length <= 3 || SINGULAR_ENDINGS.some((end) => word.endsWith(end))) return word;
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/**
 * Canonical key for a concept name: "Bump Pointers" and "bump-pointer" collide.
 * Only the last word is singularized so "lifetimes of objects" doesn't drift.
 * Returns '' for names with nothing alphanumeric.
 */
export function slugifyConcept(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’'`]/g, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/(^|\s)\.+|\.+(\s|$)/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  words[words.length - 1] = singularize(words[words.length - 1]!);
  return words.join('-');
}

function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CONCEPT_NAME_CHARS).trim();
}

function asRole(value: unknown): ConceptRole {
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (CONCEPT_ROLES as readonly string[]).includes(lower) ? (lower as ConceptRole) : 'uses';
}

function asWeight(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return 0.5;
  return Math.round(Math.min(1, Math.max(0.05, n)) * 100) / 100;
}

function asRelationType(value: unknown): ConceptRelationType | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  return (CONCEPT_RELATION_TYPES as readonly string[]).includes(normalized)
    ? (normalized as ConceptRelationType)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Reads `concepts` and `relations` from a decoded model payload.
 * `knownSlugs` are concepts already in this inquiry: relations may point at
 * them even if this node didn't list them, which is how cross-branch edges form.
 */
export function parseConceptExtraction(
  payload: unknown,
  knownSlugs: Iterable<string> = [],
): ConceptExtraction {
  if (!isRecord(payload)) return EMPTY_EXTRACTION;

  const bySlug = new Map<string, ExtractedConcept>();
  const rawConcepts = Array.isArray(payload.concepts) ? payload.concepts : [];
  for (const item of rawConcepts) {
    const rawName =
      typeof item === 'string'
        ? item
        : isRecord(item) && typeof item.name === 'string'
          ? item.name
          : null;
    if (!rawName) continue;
    const name = cleanName(rawName);
    const slug = slugifyConcept(name);
    if (!slug) continue;
    const role = isRecord(item) ? asRole(item.role) : 'uses';
    const weight = isRecord(item) ? asWeight(item.weight) : 0.5;
    const existing = bySlug.get(slug);
    if (!existing || existing.weight < weight) bySlug.set(slug, { name, slug, role, weight });
  }
  const concepts = [...bySlug.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_CONCEPTS_PER_NODE);

  const resolvable = new Set([...knownSlugs, ...concepts.map((c) => c.slug)]);
  const seen = new Set<string>();
  const relations: ExtractedRelation[] = [];
  const rawRelations = Array.isArray(payload.relations) ? payload.relations : [];
  for (const item of rawRelations) {
    if (relations.length >= MAX_RELATIONS_PER_NODE) break;
    if (!isRecord(item) || typeof item.from !== 'string' || typeof item.to !== 'string') continue;
    const type = asRelationType(item.type);
    const fromSlug = slugifyConcept(item.from);
    const toSlug = slugifyConcept(item.to);
    if (!type || !fromSlug || !toSlug || fromSlug === toSlug) continue;
    if (!resolvable.has(fromSlug) || !resolvable.has(toSlug)) continue;
    const key = `${fromSlug}|${type}|${toSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const why =
      typeof item.why === 'string'
        ? item.why.replace(/\s+/g, ' ').trim().slice(0, MAX_JUSTIFICATION_CHARS)
        : '';
    relations.push({ fromSlug, toSlug, type, justification: why });
  }

  return { concepts, relations };
}

export interface KnownConcept {
  name: string;
  slug: string;
  aliases: readonly string[];
}

/**
 * Entity resolution against the inquiry's existing concepts. A new name whose
 * slug matches an existing concept's alias is rewritten to that concept's
 * canonical slug, so the database upsert (keyed on slug) merges them.
 */
export function resolveAgainstKnown(
  extraction: ConceptExtraction,
  known: readonly KnownConcept[],
): ConceptExtraction {
  const canonical = new Map<string, string>();
  for (const concept of known) {
    canonical.set(concept.slug, concept.slug);
    for (const alias of concept.aliases) {
      const aliasSlug = slugifyConcept(alias);
      if (aliasSlug && !canonical.has(aliasSlug)) canonical.set(aliasSlug, concept.slug);
    }
  }
  const resolve = (slug: string) => canonical.get(slug) ?? slug;

  const merged = new Map<string, ExtractedConcept>();
  for (const concept of extraction.concepts) {
    const slug = resolve(concept.slug);
    const prev = merged.get(slug);
    if (!prev || prev.weight < concept.weight) merged.set(slug, { ...concept, slug });
  }

  const seen = new Set<string>();
  const relations: ExtractedRelation[] = [];
  for (const relation of extraction.relations) {
    const fromSlug = resolve(relation.fromSlug);
    const toSlug = resolve(relation.toSlug);
    const key = `${fromSlug}|${relation.type}|${toSlug}`;
    if (fromSlug === toSlug || seen.has(key)) continue;
    seen.add(key);
    relations.push({ ...relation, fromSlug, toSlug });
  }

  return { concepts: [...merged.values()], relations };
}

/**
 * Keeps the PREREQUISITE_OF sub-graph acyclic (docs/INTELLIGENCE_ARCHITECTURE.md §13):
 * a new prerequisite relation that would close a cycle with existing edges, or
 * with relations accepted earlier in the same batch, is dropped. Other relation
 * types are unaffected.
 */
export function dropCyclicPrerequisites(extraction: ConceptExtraction, graph: ConceptGraph): ConceptExtraction {
  const slugById = new Map(graph.concepts.map((c) => [c.id, c.slug]));
  const existing = graph.conceptEdges
    .filter((e) => e.relationType === 'PREREQUISITE_OF')
    .flatMap((e) => {
      const from = slugById.get(e.sourceConceptId);
      const to = slugById.get(e.targetConceptId);
      return from && to ? [{ from, to }] : [];
    });
  const candidates = extraction.relations
    .filter((r) => r.type === 'PREREQUISITE_OF')
    .map((relation) => ({ from: relation.fromSlug, to: relation.toSlug, relation }));
  const { rejected } = acceptAcyclic(existing, candidates);
  if (rejected.length === 0) return extraction;
  const dropped = new Set(rejected.map((r) => r.relation));
  return { ...extraction, relations: extraction.relations.filter((r) => !dropped.has(r)) };
}
