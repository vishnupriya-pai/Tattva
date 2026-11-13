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
