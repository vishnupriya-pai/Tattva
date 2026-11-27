# Deployment (Vercel)

Tattva runs as **two Vercel projects** built from this monorepo and deployed from a developer machine with the Vercel CLI (`npx --yes vercel@67.0.0 …`):

| Project | Source | What Vercel runs |
|---|---|---|
| API | `apps/api` | One Vercel Function bundling the Express app (`src/vercel.ts`), built locally by `npm run build:vercel` into `apps/api/.vercel/output` ([Build Output API](https://vercel.com/docs/build-output-api/v3)) and uploaded with `vercel deploy --prebuilt` |
| Web | `apps/web` (project Root Directory) | The Next.js app, built **on Vercel** from a CLI upload of the repo root (`vercel deploy --prod` at the root). `.vercelignore` keeps `.env*`, `node_modules`, build output, logs and the PRD out of the upload |

The API is built locally so Vercel never compiles the workspace TypeScript packages itself. The web app is built remotely because `vercel build` on Windows needs symlink permission (Developer Mode); Next.js already transpiles `@tattva/*` via `transpilePackages`.

Current production URLs: web <https://tattva-web-sepia.vercel.app>, API <https://tattva-api.vercel.app>.

## Limits on Vercel (accepted trade-offs)

- **Request body cap 4.5 MB.** Voice questions above ~1–2 minutes of audio are rejected by the platform before reaching the API's 15 MB limit (`docs/ARCHITECTURE.md` §6.8).
- **Burst limits are per function instance.** The per-minute limiter (`middleware/rateLimit.ts`) is in memory, so concurrent instances each count separately. Daily per-user and global caps live in Postgres and are unaffected.
- **Function timeout 60 s** (`.vc-config.json` `maxDuration`).
- The Hobby plan is for non-commercial use.

## Environment variables

API project (Production):

| Name | Value | Set by |
|---|---|---|
| `SARVAM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | secrets | the owner, via `node scripts/vercel-env-push.mjs api` (marked sensitive) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase project URL / anon key | same script |
| `NODE_ENV` | `production` (enables fail-closed quota checks) | CLI |
| `CORS_ORIGIN` | the web project's production URL | CLI |
| `AI_DAILY_GLOBAL_LIMIT` | daily Sarvam request cap, e.g. `5000` | CLI |

Web project (Production; `NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing them):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | the API project's production URL |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `…_PUBLISHABLE_KEY` | via `node scripts/vercel-env-push.mjs web` |

`scripts/vercel-env-push.mjs` reads the local env file, sends only the names it lists, pipes each value to `vercel env add` and never prints values.

## Deploy steps

From the repo root, once per machine: `npx --yes vercel@67.0.0 login`.

```bash
# API
cd apps/api
npx --yes vercel@67.0.0 link --yes --project tattva-api   # first time only
npm run build:vercel
npx --yes vercel@67.0.0 deploy --prebuilt --prod

# Web (from the repo root; the project's Root Directory is apps/web)
cd ../..
npx --yes vercel@67.0.0 link --yes --project tattva-web   # first time only
npx --yes vercel@67.0.0 deploy --prod
```

`scripts/vercel-env-push.mjs web` expects `apps/web/.vercel/project.json`; link `apps/web` to the same project too (or copy the root `.vercel/project.json` there).

On Windows Git Bash, prefix `vercel api /v9/...` calls with `MSYS_NO_PATHCONV=1`, or the path is rewritten into a Windows file path.

After the first deploy of each, set `NEXT_PUBLIC_API_URL` (web) and `CORS_ORIGIN` (API) to each other's production URLs, then redeploy both.

## Supabase Auth

Add the web production URL to Supabase → Authentication → URL Configuration (Site URL / Redirect URLs), or Google and email sign-in will redirect to the wrong place.
