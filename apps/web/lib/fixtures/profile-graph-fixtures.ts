import type { QuestionNode } from '../workspace-types';

/**
 * Static, cross-source "lifetime" Knowledge Graph for the Profile page.
 * Unlike a per-inquiry graph, this combines every domain a learner has
 * touched into a single forest (one root per source) so the breadth of
 * their learning history is visible at a glance. Hardcoded for the demo —
 * not persisted, not produced by Sarvam.
 */

function noFollowUps() {
  return [];
}

export const profileGraphNodes: QuestionNode[] = [
  // ---- Central hub: ties every domain into a single connected graph ----
  {
    id: 'profile-hub',
    parentNodeId: null,
    userQuestion: 'Your Learning Core',
    aiExplanation:
      'Every inquiry you have ever launched, across every source and domain, branches outward from here — ' +
      'one continuous graph instead of disconnected fragments.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-01T00:00:00.000Z',
    status: 'ready',
  },

  // ---- Domain 1: Transformers & Self-Attention (AI Research) ----
  {
    id: 'profile-ai-root',
    parentNodeId: 'profile-hub',
    userQuestion: 'Why does self-attention scale better with long-range dependencies than RNNs?',
    aiExplanation:
      'Because every token attends to every other token in a single matrix multiplication, so the ' +
      'path length between any two positions is O(1) instead of O(n) as in a recurrent network.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-01T09:00:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-ai-qkv',
    parentNodeId: 'profile-ai-root',
    userQuestion: 'What are Query, Key, and Value projections actually doing geometrically?',
    aiExplanation:
      'They project each token embedding into three learned subspaces; the Query/Key dot product ' +
      'measures alignment, and the Value vector is what gets mixed in proportion to that alignment.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-01T09:12:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-ai-scaling-trap',
    parentNodeId: 'profile-ai-root',
    userQuestion: 'So attention is scale-invariant — the softmax normalizes it, so dot products can be any size?',
    aiExplanation:
      'Not quite — that assumption is the trap. Unscaled dot products grow with embedding dimension, ' +
      'pushing softmax into saturated regions with vanishing gradients; the 1/sqrt(d_k) scale factor exists ' +
      'precisely to counter that.',
    researchMode: false,
    isTrap: true,
    trapMetadata: {
      misconceptionType: 'numerical_stability',
      scenario: 'Explain why removing the sqrt(d_k) scaling term destabilizes training at high embedding dimensions.',
      resolutionRequired: true,
    },
    trapResolvedAt: '2026-11-01T09:25:00.000Z',
    followUps: noFollowUps(),
    createdAt: '2026-11-01T09:18:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-ai-multihead',
    parentNodeId: 'profile-ai-root',
    userQuestion: 'Why use multiple attention heads instead of one larger one?',
    aiExplanation:
      'Separate heads can specialize on different relational patterns (syntax, coreference, position) in ' +
      'parallel subspaces; a single head is forced to average all of these into one attention distribution.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-02T10:05:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-ai-research',
    parentNodeId: 'profile-ai-root',
    userQuestion: 'How does positional encoding let a permutation-invariant operation understand order at all?',
    aiExplanation:
      'Research Mode: no direct answer. Compare the original sinusoidal scheme against learned and rotary ' +
      '(RoPE) encodings — what invariance does each one buy, and at what cost to extrapolation beyond the ' +
      'training context length?',
    researchMode: true,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-02T10:30:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-ai-flashattn',
    parentNodeId: 'profile-ai-multihead',
    userQuestion: 'What does FlashAttention actually change — the math or just the implementation?',
    aiExplanation:
      'Only the implementation. It fuses the softmax and matmul steps and tiles them to avoid materializing ' +
      'the full n×n attention matrix in HBM, trading recomputation for memory bandwidth — the output is ' +
      'numerically identical.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-03T08:40:00.000Z',
    status: 'ready',
  },

  // ---- Domain 2: Operating Systems (low-level systems) ----
  {
    id: 'profile-os-root',
    parentNodeId: 'profile-hub',
    userQuestion: 'Why do we need both semaphores and mutexes if a mutex is just a binary semaphore?',
    aiExplanation:
      'A mutex encodes ownership — only the thread that locked it may unlock it — while a semaphore is a ' +
      'bare counter any thread may increment or decrement, which makes it suited to signaling between ' +
      'threads rather than protecting a critical section.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-05T14:00:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-os-deadlock',
    parentNodeId: 'profile-os-root',
    userQuestion: 'What are the four Coffman conditions that must all hold for a deadlock to occur?',
    aiExplanation:
      'Mutual exclusion, hold-and-wait, no preemption, and circular wait. Breaking any single one of the ' +
      'four is sufficient to make deadlock structurally impossible in that system.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-05T14:15:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-os-trap',
    parentNodeId: 'profile-os-root',
    userQuestion: 'If I just use a single global lock everywhere, I can never deadlock — that eliminates the risk, right?',
    aiExplanation:
      'Not quite — that assumption is the trap. A single global lock removes circular wait between distinct ' +
      'locks, but a thread can still deadlock against itself via re-entrant locking, or against another ' +
      'process waiting on a resource the lock-holder needs — and it collapses all your concurrency.',
    researchMode: false,
    isTrap: true,
    trapMetadata: {
      misconceptionType: 'concurrency_design',
      scenario: 'A single global mutex guards every shared structure. Explain a concrete scenario where this still deadlocks.',
      resolutionRequired: true,
    },
    trapResolvedAt: '2026-11-05T14:40:00.000Z',
    followUps: noFollowUps(),
    createdAt: '2026-11-05T14:28:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-os-scheduling',
    parentNodeId: 'profile-os-root',
    userQuestion: 'How does the CFS scheduler decide which runnable thread goes next?',
    aiExplanation:
      'It tracks each task\'s "virtual runtime" in a red-black tree and always dispatches the task with the ' +
      'smallest vruntime, which keeps CPU time fairly distributed without fixed time-slice bookkeeping.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-06T11:00:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-os-priority-inv',
    parentNodeId: 'profile-os-scheduling',
    userQuestion: 'What is priority inversion and why did it famously hang the Mars Pathfinder?',
    aiExplanation:
      'A low-priority task holding a lock a high-priority task needs gets preempted by medium-priority work, ' +
      'so the high-priority task waits indefinitely — fixed on Pathfinder by enabling priority inheritance on ' +
      'the mutex.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-06T11:20:00.000Z',
    status: 'ready',
  },

  // ---- Domain 3: Cryptography ----
  {
    id: 'profile-crypto-root',
    parentNodeId: 'profile-hub',
    userQuestion: 'How does Diffie-Hellman let two parties agree on a shared secret over a public channel?',
    aiExplanation:
      'Each party combines their private exponent with the other\'s public value; because modular ' +
      'exponentiation commutes (g^a^b = g^b^a mod p), both sides land on the same shared secret without ' +
      'ever transmitting it.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-11T16:00:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-crypto-dlog',
    parentNodeId: 'profile-crypto-root',
    userQuestion: 'What makes recovering the private exponent from the public value computationally hard?',
    aiExplanation:
      'The discrete logarithm problem: given g, p, and g^a mod p, there is no known efficient classical ' +
      'algorithm to recover a — the best general approaches remain sub-exponential.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-11T16:15:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-crypto-mitm-trap',
    parentNodeId: 'profile-crypto-root',
    userQuestion: 'Since the shared secret is never transmitted, Diffie-Hellman is immune to eavesdropping, full stop?',
    aiExplanation:
      'Not quite — that assumption is the trap. Plain DH has no authentication step, so a man-in-the-middle ' +
      'can run the protocol separately with each party and relay/alter traffic; that is exactly why TLS ' +
      'signs the DH exchange rather than trusting it bare.',
    researchMode: false,
    isTrap: true,
    trapMetadata: {
      misconceptionType: 'protocol_security',
      scenario: 'Explain how an active man-in-the-middle defeats unauthenticated Diffie-Hellman, step by step.',
      resolutionRequired: true,
    },
    trapResolvedAt: '2026-11-11T16:35:00.000Z',
    followUps: noFollowUps(),
    createdAt: '2026-11-11T16:22:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-crypto-forward-secrecy',
    parentNodeId: 'profile-crypto-root',
    userQuestion: 'What is forward secrecy and why does it require ephemeral keys?',
    aiExplanation:
      'Forward secrecy means a future key compromise cannot decrypt past sessions. It requires fresh, ' +
      'session-scoped DH exponents (DHE/ECDHE) that are discarded after use, since a long-lived static key, ' +
      'if ever leaked, would retroactively expose every session that used it.',
    researchMode: false,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-12T09:10:00.000Z',
    status: 'ready',
  },
  {
    id: 'profile-crypto-ecdh',
    parentNodeId: 'profile-crypto-forward-secrecy',
    userQuestion: 'Why do most modern systems use elliptic-curve Diffie-Hellman instead of classic modular DH?',
    aiExplanation:
      'Research Mode: no direct answer. Compare the best-known attacks on the elliptic-curve discrete ' +
      'logarithm problem against the number field sieve for classic DH, and derive why ECDH reaches ' +
      'equivalent security with far smaller key sizes.',
    researchMode: true,
    isTrap: false,
    trapMetadata: null,
    trapResolvedAt: null,
    followUps: noFollowUps(),
    createdAt: '2026-11-12T09:30:00.000Z',
    status: 'ready',
  },
];

export interface ProfileDomainSummary {
  rootNodeId: string;
  label: string;
  nodeCount: number;
}

export const profileDomainSummaries: ProfileDomainSummary[] = [
  { rootNodeId: 'profile-ai-root', label: 'Transformers & Self-Attention', nodeCount: 6 },
  { rootNodeId: 'profile-os-root', label: 'Operating Systems', nodeCount: 5 },
  { rootNodeId: 'profile-crypto-root', label: 'Cryptography', nodeCount: 5 },
];

export const profileTrapsSurvived = profileGraphNodes.filter((n) => n.isTrap && n.trapResolvedAt).length;
export const profileResearchNodes = profileGraphNodes.filter((n) => n.researchMode).length;
export const profileTotalNodes = profileGraphNodes.length - 1; // exclude the synthetic hub node
