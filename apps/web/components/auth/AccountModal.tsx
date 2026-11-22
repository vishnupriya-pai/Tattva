'use client';

import React, { useEffect, useState } from 'react';
import { Mail, ShieldCheck, X } from 'lucide-react';
import {
  AccountExistsError,
  saveProgressWithEmail,
  saveProgressWithGoogle,
  signInWithEmail,
  signInWithGoogle,
  verifyEmailCode,
} from '../../lib/account';

export type AccountModalMode = 'save' | 'signin';

export interface AccountModalProps {
  initialMode: AccountModalMode;
  initialNotice?: string | null;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AccountModal: React.FC<AccountModalProps> = ({ initialMode, initialNotice, onClose }) => {
  const [mode, setMode] = useState<AccountModalMode>(initialMode);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialNotice ?? null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setConflict(false);
    try {
      await action();
    } catch (err) {
      if (err instanceof AccountExistsError) {
        setConflict(true);
        setError('That account already exists. Sign in to it instead. Progress from this anonymous session will not be merged into it.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () => run(mode === 'save' ? saveProgressWithGoogle : signInWithGoogle);

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    void run(async () => {
      await (mode === 'save' ? saveProgressWithEmail(trimmed) : signInWithEmail(trimmed));
      setCodeSentTo(trimmed);
    });
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeSentTo || !/^\d{6,10}$/.test(code.trim())) {
      setError('Enter the numeric code from the email.');
      return;
    }
    void run(async () => {
      await verifyEmailCode(codeSentTo, code.trim(), mode);
      window.location.reload();
    });
  };

  const switchMode = (next: AccountModalMode) => {
    setMode(next);
    setCodeSentTo(null);
    setCode('');
    setError(null);
    setConflict(false);
  };

  const isSave = mode === 'save';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-line bg-surface-1 p-6 shadow-2xl text-fg space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line-strong bg-surface-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="account-modal-title" className="text-base font-semibold">
                {isSave ? 'Save your progress' : 'Sign in'}
              </h2>
              <p className="text-xs text-fg-muted">
                {isSave
                  ? 'Keep your Knowledge Graph and Stamina across devices.'
                  : 'Continue with an existing Tattva account.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-fg-muted hover:text-fg hover:bg-surface-2 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {codeSentTo ? (
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <p className="text-sm text-fg-body">
              We sent an email to <span className="font-mono text-fg">{codeSentTo}</span>. Click the link in it, or
              enter the code below.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code from email"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-line-strong bg-bg/40 px-3.5 py-2.5 font-mono text-sm tracking-widest focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl border border-line-strong bg-surface-2 px-4 py-2.5 text-sm font-medium hover:border-gold transition cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Verify code'}
            </button>
            <button
              type="button"
              onClick={() => setCodeSentTo(null)}
              className="w-full text-xs text-fg-muted hover:text-fg cursor-pointer"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-4 py-2.5 text-sm font-medium hover:border-gold transition cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.8z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1C3.3 21.4 7.3 24 12 24z" />
                <path fill="#FBBC05" d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.5h-4C.5 8.2 0 10 0 12s.5 3.8 1.3 5.5l4-3.1z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.3 2.6 1.3 6.5l4 3.1c1-2.8 3.6-4.8 6.7-4.8z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-xs text-fg-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3">
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line-strong bg-bg/40 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-4 py-2.5 text-sm font-medium hover:border-gold transition cursor-pointer disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {busy ? 'Sending…' : 'Continue with email'}
              </button>
            </form>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-trap/40 bg-trap/10 p-3 text-xs text-fg-body space-y-2">
            <p>{error}</p>
            {conflict && isSave && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="font-medium text-fg underline cursor-pointer"
              >
                Sign in to the existing account
              </button>
            )}
          </div>
        )}

        <div className="border-t border-line pt-3 text-xs text-fg-muted">
          {isSave ? (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('signin')} className="text-fg underline cursor-pointer">
                Sign in
              </button>
            </>
          ) : (
            <>
              Signing in switches this browser to that account. Work done in the current anonymous session is not
              merged.{' '}
              <button type="button" onClick={() => switchMode('save')} className="text-fg underline cursor-pointer">
                Save this session instead
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
