import type { AuthError } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase/client';

/**
 * Permanent-account flows on top of the anonymous-first session (ADR-004).
 * "Save" links Google/email to the current anonymous user, keeping the same
 * auth.users.id so inquiries and Stamina carry over. "Sign in" switches to
 * an existing account; the current anonymous session's data is not merged.
 */
export type AccountIdentity = {
  isAnonymous: boolean;
  email: string | null;
};

export class AccountExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountExistsError';
  }
}

function redirectUrl(): string {
  return window.location.origin;
}

function toError(error: AuthError): Error {
  if (error.code === 'email_exists' || error.code === 'identity_already_exists' || error.code === 'user_already_exists') {
    return new AccountExistsError(error.message);
  }
  if (error.code === 'manual_linking_disabled') {
    return new Error('Account linking is disabled on the Supabase project (enable "Manual linking" in Auth settings).');
  }
  if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return new Error('Too many attempts. Wait a minute and try again.');
  }
  return new Error(error.message);
}

export async function getAccountIdentity(): Promise<AccountIdentity | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return { isAnonymous: user.is_anonymous ?? false, email: user.email ?? null };
}

export async function saveProgressWithGoogle(): Promise<void> {
  const { error } = await getSupabaseClient().auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  });
  if (error) throw toError(error);
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl() },
  });
  if (error) throw toError(error);
}

export async function saveProgressWithEmail(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.updateUser({ email }, { emailRedirectTo: redirectUrl() });
  if (error) throw toError(error);
}

export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl(), shouldCreateUser: true },
  });
  if (error) throw toError(error);
}

export async function verifyEmailCode(email: string, token: string, mode: 'save' | 'signin'): Promise<void> {
  const { error } = await getSupabaseClient().auth.verifyOtp({
    email,
    token,
    type: mode === 'save' ? 'email_change' : 'email',
  });
  if (error) throw toError(error);
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw toError(error);
}

/**
 * Supabase reports OAuth/link failures in the redirect URL (hash or query).
 * Reads them and strips them from the address bar. Call only after
 * `auth.getSession()` resolves so the client has finished reading the URL.
 */
export function consumeAuthRedirectError(): { code: string | null; message: string } | null {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const read = (key: string) => url.searchParams.get(key) ?? hash.get(key);

  const description = read('error_description');
  const code = read('error_code');
  if (!description && !read('error')) return null;

  for (const key of ['error', 'error_code', 'error_description']) url.searchParams.delete(key);
  const cleanHash = hash.has('error') ? '' : url.hash;
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${cleanHash}`);

  return { code, message: description ?? 'Sign-in failed.' };
}
