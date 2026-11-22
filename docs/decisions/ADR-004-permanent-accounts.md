# ADR-004: Permanent Accounts — Google and Email on Top of Anonymous Sign-In

## Status

**Implemented** (`feat/permanent-accounts`). Extends [ADR-002](ADR-002-authentication.md); does not replace it.

## Context

ADR-002's anonymous-only identity loses a learner's Knowledge Graph and Stamina when browser storage is cleared or the device changes, and cannot back the PRD's long-term recruiter-facing claims. Real users need a durable account before rollout.

## Decision

1. **Anonymous-first stays.** A first visit still gets an anonymous session, so nothing stands in front of the first inquiry.
2. **"Save your progress" links an identity to the current anonymous user** with `auth.linkIdentity({ provider: 'google' })` or `auth.updateUser({ email })`. The `auth.users.id` is unchanged, so every `inquiries`, `question_nodes` and `wallet_transactions` row carries over with no data migration, and RLS needs no change.
3. **"Sign in" switches to an existing account** with `auth.signInWithOAuth` or `auth.signInWithOtp`. It is passwordless: email uses a magic link or a one-time code, so there is no password storage or reset flow.
4. **No merge of anonymous data into an existing account.** If the Google identity or email already belongs to another user (`identity_already_exists` / `email_exists`), the UI tells the learner and offers sign-in. The anonymous session's rows stay in the database, owned by the orphaned anonymous user. Merging would rewrite ownership of immutable ledger rows (CLAUDE.md invariant 6), so it needs its own decision.
5. **Sign out** clears the session; the next load creates a fresh anonymous session.
6. Backend verification is unchanged: `requireAuth` still verifies every bearer token, and `isAnonymous` comes from the server-verified user.

Code: `apps/web/lib/account.ts`, `apps/web/components/auth/AccountModal.tsx`, wired in `WorkspaceEntry.tsx` and `TopNavBar.tsx`.

## Required Supabase project configuration (manual, per environment)

Dashboard → Authentication:

1. **Sign In / Providers → Allow manual linking: on.** Without it, "Save with Google" fails with `manual_linking_disabled`.
2. **Sign In / Providers → Allow anonymous sign-ins: on** (already required by ADR-002).
3. **Providers → Google: enable**, with a Client ID and Secret from a Google Cloud OAuth client (type "Web application"). In Google Cloud, add the Supabase callback URL shown on that page (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorised redirect URI.
4. **URL Configuration:** set Site URL to the production web origin and add every origin the app runs on (production, Vercel previews, `http://localhost:3000`) to Redirect URLs.
5. **Emails → templates "Magic Link" and "Change Email Address":** include `{{ .Token }}` so the in-app code entry works. The link alone works without this change.
6. **SMTP:** configure a custom SMTP provider (Resend, Postmark, SES, …). Supabase's built-in sender is rate-limited to a handful of emails per hour and is not meant for real users.

Local dev: `supabase/config.toml` enables manual linking. Google is off locally unless you set `enabled = true` and export `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`. Local emails appear in Inbucket/Mailpit (`supabase status` shows the URL).

## Consequences

- Learners who save keep their history across devices; the recruiter-facing identity gap in ADR-002 is closed for saved accounts.
- Anonymous sign-ins remain an abuse vector for AI cost; per-user/IP rate limiting is still required before rollout.
- Account deletion/export is still undecided and conflicts with the immutable ledger; it must be decided before public launch.
