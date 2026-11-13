-- Tattva local development seed data.
--
-- Run automatically by `supabase db reset` (see docs/development-setup.md).
-- Seeds the curated `learning_sources` row used by the Golden Path demo
-- (docs/ARCHITECTURE.md §10.1) — the same material already used as a
-- frontend fixture in apps/web/lib/fixtures/workspace-fixtures.ts, now
-- persisted for real. Safe to rerun: a fixed id + ON CONFLICT upsert means
-- `supabase db reset` never duplicates this row.

insert into public.learning_sources (id, title, description, source_type, duration_minutes, source_reference, published_at, content)
values (
  '11111111-1111-4111-8111-111111111111',
  'Memory Arena Allocators: Design and Trade-offs',
  'A dense walkthrough of arena/bump allocators, free-list strategies, and the fragmentation trade-offs systems engineers accept when they trade general-purpose malloc for a custom allocator.',
  'transcript',
  38,
  'seed/memory-arena-allocators.txt',
  now(),
  $content$Arena allocation trades flexibility for throughput. Instead of tracking individual block metadata the way a general-purpose allocator does, an arena allocator reserves one contiguous region up front and satisfies allocations by advancing a single bump pointer. Freeing is batched: the whole arena is reset or released at once, never per-object.

This works well when object lifetimes are correlated — a request handler, a single frame of a game loop, a parser pass over one file. It works badly when lifetimes are independent, because there is no way to reclaim an individual object's memory without invalidating every allocation made after it in the same arena.

A free-list allocator reintroduces per-object reclamation by threading freed blocks into a linked list keyed by size class, at the cost of metadata overhead and fragmentation as blocks of mismatched sizes accumulate. Hybrid designs use arenas for short-lived, correlated allocations and fall back to a general-purpose allocator or a size-class free list for everything else.

The failure mode to watch for: holding a pointer into an arena past the arena's reset point. Because the arena's bump pointer is just rewound, the memory is not zeroed or protected — a stale pointer silently aliases whatever is allocated next, producing memory-safety bugs that are very difficult to reproduce.$content$
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  source_type = excluded.source_type,
  duration_minutes = excluded.duration_minutes,
  source_reference = excluded.source_reference,
  content = excluded.content;

insert into public.learning_sources (id, title, description, source_type, duration_minutes, source_reference, published_at, content)
values (
  '22222222-2222-4222-8222-222222222222',
  'Attention Is All You Need: Transformers & Multi-Head Attention',
  'The foundational 2017 paper by Vaswani et al. introducing the Transformer architecture, self-attention mechanisms, and parallelized sequence transduction.',
  'document',
  45,
  'arXiv:1706.03762',
  now(),
  $content$Recurrent neural networks, long short-term memory [13] and gated recurrent [7] neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation [35, 2, 5]. Numerous efforts have since continued to push the boundaries of recurrent language models and encoder-decoder architectures [38, 24, 15].

Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states ht, as a function of the previous hidden state ht-1 and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples. Recent work has achieved significant improvements in computational efficiency through factorization tricks [21] and conditional computation [32], while also improving model performance in case of the latter. The fundamental constraint of sequential computation, however, remains.

Attention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in the input or output sequences [2, 19]. In all but a few cases [27], however, such attention mechanisms are used in conjunction with a recurrent network.

In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.

Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this. Instead of performing a single attention function with d_model-dimensional keys, values and queries, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to d_k, d_k and d_v dimensions, respectively.

We inspect attention distributions from our models and present and discuss examples in the appendix. Not only do individual attention heads clearly learn to perform different tasks, many appear to exhibit behavior related to the syntactic and semantic structure of the sentences.$content$
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  source_type = excluded.source_type,
  duration_minutes = excluded.duration_minutes,
  source_reference = excluded.source_reference,
  content = excluded.content;
