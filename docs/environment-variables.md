# Environment Variables

Full reference for every environment variable used by Tattva. See `docs/development-setup.md` for how to create your local `.env` files from these. Backend variables are validated at startup by `apps/api/src/config/env.ts` (Zod); invalid or missing **required** values stop the server from starting with a clear error.

## apps/api (`apps/api/.env.local` or `apps/api/.env`, copied from `apps/api/.env.example`)

| Variable | Required? | Visibility | Purpose |
|---|---|---|---|
| `NODE_ENV` | Required (defaults to `development`) | Server-only | `development` \| `test` \| `production` |
| `PORT` | Required (defaults to `4000`) | Server-only | Port the Express server listens on |
| `CORS_ORIGIN` | Required (defaults to `http://localhost:3000`) | Server-only | The exact frontend origin allowed to call the API. Never widened to `*` (`CLAUDE.md` §5) |
| `AI_DAILY_GLOBAL_LIMIT` | Optional (defaults to `5000`) | Server-only | Max Sarvam-calling requests per India-time day across all users; the hard daily cost cap ([ARCHITECTURE.md §6.8](ARCHITECTURE.md)) |
| `SARVAM_API_KEY` | Optional for basic API; required for AI generation and trap evaluation | **Secret** | Sarvam AI credential. Read only by the backend adapter. Never exposed to the browser |
| `SUPABASE_URL` | Optional for `/health`; required for any `/api/v1/*` route to work | Server-only | Supabase project URL, same value as the frontend's `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Optional for `/health`; required for any `/api/v1/*` route to work | Server-only (mirrors a public value) | Used to construct the request-scoped, RLS-protected Supabase client and to verify caller access tokens (auth middleware) |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for graph creation/trap resolution; optional for Stamina awards | **Secret** | Privileged credential used only by trusted backend writes after ownership checks. Never exposed to the browser or used for ordinary reads |

All four Sarvam/Supabase variables are **optional at the env-parsing level** — the server must start and `/health` must respond without any of them set (`CLAUDE.md` §5/§6). Since Stage 5, `SUPABASE_URL`/`SUPABASE_ANON_KEY` are required in practice to use any `/api/v1/*` route: without them, `auth.middleware.ts` returns `503 auth_not_configured` rather than crashing the process. Do not put placeholder-looking fake values in a committed file; leave them blank in `.env.example` and fill in real ones only in your own local, gitignored `.env`.

## apps/web (`apps/web/.env.local`, copied from `apps/web/.env.example`)

| Variable | Required? | Visibility | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Required (defaults to `http://localhost:4000`) | **Public** (bundled into client JS) | Base URL the frontend's API client (`apps/web/lib/api-client.ts`) calls |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional for fixture-only rendering; required to establish a real session (`lib/auth.ts`) | **Public** | Supabase project URL — safe to expose; it is not a secret |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional for static rendering; required to establish a real session (`lib/auth.ts`) | **Public** | Supabase public/anon or publishable key — safe to expose only because Supabase RLS enforces per-row access (`docs/DATABASE.md` §10) |

**Non-negotiable rule (`CLAUDE.md` §5):** any variable prefixed `NEXT_PUBLIC_` is bundled into client-side JavaScript and is readable by anyone. `SARVAM_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must never be given that prefix, and must never be read from `apps/web` at all.

## Adding a new variable

1. Add it to the relevant app's Zod schema (`apps/api/src/config/env.ts` for the backend; the frontend currently reads `process.env.NEXT_PUBLIC_*` directly since there's only one value so far — introduce a small validated config module there once there are more).
2. Add it to that app's `.env.example` with a comment explaining required/optional and public/secret status.
3. Add a row to the table above.
4. Never commit a real value, even a throwaway-looking one, to `.env.example`.
