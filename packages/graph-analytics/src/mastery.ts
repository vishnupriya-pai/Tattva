import type { ConceptRole } from '@tattva/contracts';
import type { DirectedEdge } from './prerequisites';

export type MasteryStatus = 'untouched' | 'touched' | 'explored' | 'mastered' | 'misconception';

export interface ConceptMastery {
  /** 0–1. */
  score: number;
  status: MasteryStatus;
  /** True when the score came (partly) from propagation along prerequisite edges. */
  inferred: boolean;
}

export interface MasteryMention {
  conceptId: string;
  role: ConceptRole;
  weight: number;
  /** Trap state of the mentioning question node. */
  trap: 'none' | 'unresolved' | 'resolved';
}

const ROLE_FACTOR: Record<ConceptRole, number> = {
  defines: 1,
  contrasts: 0.7,
  uses: 0.6,
  misconceives: 0.5,
};
/** Reading about a concept without surviving a trap on it caps below "mastered". */
const EXPOSURE_CAP = 0.75;
const EXPLORED_THRESHOLD = 0.35;
const MISCONCEPTION_SCORE = 0.15;
/** Credit passed to a prerequisite per hop when its dependent is understood. */
const PROPAGATION_DECAY = 0.5;
const PROPAGATION_HOPS = 2;

/**
 * Mastery is evidence-based, not activity-based:
 * - an unresolved trap on a question that mentions a concept marks it a misconception;
 * - surviving a trap on it marks it mastered;
 * - otherwise exposure accumulates per mention (1 − Π(1 − 0.4·weight·roleFactor)), capped;
 * - understanding a concept implies partial understanding of its prerequisites
 *   (decaying per hop), never of its dependents.
 */
export function computeMastery(
  conceptIds: Iterable<string>,
  mentions: readonly MasteryMention[],
  prerequisiteEdges: readonly DirectedEdge[],
): Map<string, ConceptMastery> {
  const result = new Map<string, ConceptMastery>();
  const byConcept = new Map<string, MasteryMention[]>();
  for (const m of mentions) {
    const list = byConcept.get(m.conceptId) ?? [];
    list.push(m);
    byConcept.set(m.conceptId, list);
  }

  for (const id of conceptIds) {
    const list = byConcept.get(id) ?? [];
    if (list.length === 0) {
      result.set(id, { score: 0, status: 'untouched', inferred: false });
    } else if (list.some((m) => m.trap === 'unresolved')) {
      result.set(id, { score: MISCONCEPTION_SCORE, status: 'misconception', inferred: false });
    } else if (list.some((m) => m.trap === 'resolved')) {
      result.set(id, { score: 1, status: 'mastered', inferred: false });
    } else {
      const remaining = list.reduce((p, m) => p * (1 - 0.4 * m.weight * ROLE_FACTOR[m.role]), 1);
      const score = Math.min(EXPOSURE_CAP, 1 - remaining);
      result.set(id, {
        score,
        status: score >= EXPLORED_THRESHOLD ? 'explored' : 'touched',
        inferred: false,
      });
    }
  }

  // Propagate backwards: dependent → its prerequisites.
  const prerequisitesOf = new Map<string, string[]>();
  for (const { from, to } of prerequisiteEdges) {
    const list = prerequisitesOf.get(to) ?? [];
    list.push(from);
    prerequisitesOf.set(to, list);
  }
  const base = new Map([...result].map(([id, m]) => [id, m.score]));
  for (const [id, score] of base) {
    if (score === 0 || result.get(id)?.status === 'misconception') continue;
    let frontier = [id];
    let credit = score;
    for (let hop = 0; hop < PROPAGATION_HOPS; hop += 1) {
      credit *= PROPAGATION_DECAY;
      const nextFrontier: string[] = [];
      for (const dependent of frontier) {
        for (const prereq of prerequisitesOf.get(dependent) ?? []) {
          const current = result.get(prereq);
          if (!current || current.status === 'misconception' || current.status === 'mastered')
            continue;
          if (credit > current.score) {
            const status: MasteryStatus = credit >= EXPLORED_THRESHOLD ? 'explored' : 'touched';
            result.set(prereq, { score: credit, status, inferred: true });
          }
          nextFrontier.push(prereq);
        }
      }
      frontier = nextFrontier;
    }
  }

  for (const [id, m] of result) result.set(id, { ...m, score: Math.round(m.score * 1000) / 1000 });
  return result;
}
