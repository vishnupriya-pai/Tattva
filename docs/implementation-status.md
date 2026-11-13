# Implementation Status

## Golden Path update (2026-11-13)

The previously deferred node-generation, graph persistence, trap evaluation, and Stamina read endpoints are now implemented in code. Node generation uses the Sarvam `sarvam-105b` chat API, validates the response, and writes each node plus exactly three follow-ups atomically. The workspace now loads and updates the persisted graph. Trap answers are evaluated by Sarvam and progression unlocks only after a passing evaluation. The web and API accept Supabase publishable keys, and the API loads `.env.local` as well as `.env`.

Required before a live end-to-end run: apply `supabase/migrations/20261113120000_golden_path_workflows.sql` to the chosen Supabase project and set `SARVAM_API_KEY` plus `SUPABASE_SERVICE_ROLE_KEY` in `apps/api/.env.local`. The service-role key is used only by the API after verifying ownership and AI output; it never belongs in the web env file. The migration stores the curated source body and adds atomic workflow functions. Stamina balance/history is now API-backed, but ledger awards and the 3× Research Mode multiplier remain disabled until product point values are selected. Full content ingestion is deferred.

Classifies every Golden Path feature as **IMPLEMENTED**, **PARTIALLY IMPLEMENTED**, **MOCK DATA**, or **NOT IMPLEMENTED**, per the Stage 5 audit requirement. Written before Stage 5's changes (Phase 1 audit) and updated after them (this version) — see git history for the pre-Stage-5 snapshot if needed.

## Frontend workspace (`apps/web`)

| Feature | Status | Notes |
|---|---|---|
| Source Material panel | **IMPLEMENTED** (curated source) | Loads the seeded source body from `learning_sources`; full ingestion remains deferred. |
| Knowledge Graph (nodes/edges) | **IMPLEMENTED** | Loads persisted inquiry nodes and renders parent-child edges via `@xyflow/react`. |
| Root question node / child nodes | **IMPLEMENTED** | Nodes and follow-ups persist atomically through the authenticated API and database RPC migration. |
| Follow-up questions | **IMPLEMENTED** | Sarvam output is validated to exactly three; selecting a follow-up atomically creates and links one child node. |
| Research Mode toggle | **PARTIALLY IMPLEMENTED** | UI theme and AI prompt behavior change. The 3× Stamina multiplier awaits product scoring values. |
| Trap UI | **IMPLEMENTED** | Submissions are evaluated by the backend using Sarvam; branching stays blocked until the trap is resolved. |
| Cognitive Stamina display | **PARTIALLY IMPLEMENTED** | Balance/history read from the caller's ledger via API; award writes are disabled pending point-value decisions. |
| Inquiry composer | **IMPLEMENTED** | Root questions submit to the authenticated node-generation API. |
| Authenticated identity | **IMPLEMENTED** | `lib/auth.ts` establishes/reuses a real Supabase anonymous session; `SessionStatus` surfaces it. Never a client-invented user ID. |
| Inquiry creation/retrieval | **IMPLEMENTED** | `lib/workspace-bootstrap.ts` creates/reuses one real, persisted `inquiries` row per browser identity against the seeded demo `learning_sources` row, via the real API. |

## Backend (`apps/api`)

| Feature | Status | Notes |
|---|---|---|
| `GET /health` | **IMPLEMENTED** | Pre-existing, unchanged. |
| Auth middleware (`requireAuth`) | **IMPLEMENTED** | Verifies a Supabase Auth bearer token via `auth.getUser`; attaches `{ userId, isAnonymous, accessToken }`; never trusts a client-supplied user id; returns `503` if Supabase isn't configured, `401` on missing/invalid/expired tokens. |
| `GET /api/v1/me` | **IMPLEMENTED** | Echoes the verified identity only. |
| `POST /api/v1/inquiries` | **IMPLEMENTED** | Validates `learningSourceId` (format + existence), inserts via the request-scoped (RLS-protected) client with `user_id` from the verified token. |
| `GET /api/v1/inquiries` | **IMPLEMENTED** | Added in Stage 5 beyond the original `API_CONTRACTS.md` draft — see that doc's note. Lists the caller's own inquiries. |
| `GET /api/v1/inquiries/:inquiryId` | **IMPLEMENTED** | Ownership-checked (404, not 403, on mismatch/missing); assembles inquiry + learning source + nodes (nodes array empty until node-creation exists). |
| `POST /api/v1/inquiries/:inquiryId/nodes` | **IMPLEMENTED** | Calls Sarvam, validates output, persists exactly three follow-ups and the node atomically. |
| `POST /api/v1/question-nodes/:nodeId/trap-attempts` | **IMPLEMENTED** | Evaluates responses server-side and persists resolution. |
| `GET /api/v1/stamina/me` | **IMPLEMENTED** | Reads owner-only ledger balance/history; awarding remains disabled pending point values. |

## Database (`supabase/`)

| Feature | Status | Notes |
|---|---|---|
| `learning_sources` table + RLS + seed | **IMPLEMENTED** | One curated row seeded (Memory Arena Allocators, matching the frontend fixture's content). |
| `inquiries` table + RLS + indexes | **IMPLEMENTED** | Owner-only select/insert; no update/delete policy (immutable once created). |
| `question_nodes` table + RLS + root-uniqueness | **IMPLEMENTED** | Single-root-per-inquiry enforced by a partial unique index; node writes use the authenticated atomic workflow RPC. |
| `follow_up_questions` table + RLS + position constraints | **IMPLEMENTED** | Exactly three validated follow-ups are inserted in the same RPC transaction as the node. |
| `wallet_transactions` table + append-only grants | **IMPLEMENTED** (schema) | Append-only owner-readable ledger. Award writes remain disabled until the point policy is selected. |

## What remains blocked without a live Supabase project

All of the above was verified by: `pnpm typecheck`, `pnpm lint`, and `pnpm test` (30 tests total across `packages/contracts`, `apps/api`, `apps/web`), all passing, with the Supabase-dependent code paths covered by mocking `@supabase/supabase-js` and the repository layer. **No test here ran against an actual Postgres instance** — that requires a real or local (`npx supabase start`, Docker) Supabase project, which was not available in this environment. Specifically still blocked:

1. Running `npx supabase db reset` against a real local Postgres to confirm the migration applies cleanly and the seed is idempotent.
2. End-to-end verification: a browser establishing a real anonymous session, calling the real API, and a row actually landing in Postgres.
3. Confirming RLS actually rejects cross-user access at the database level (only verified at the service/application layer here, via mocks).

See the Stage 5 final report for the exact manual steps to unblock these.
