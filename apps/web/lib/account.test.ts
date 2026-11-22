import { afterEach, describe, expect, it, vi } from 'vitest';

const { getSupabaseClient } = vi.hoisted(() => ({ getSupabaseClient: vi.fn() }));
vi.mock('./supabase/client', () => ({ getSupabaseClient }));

import {
  AccountExistsError,
  consumeAuthRedirectError,
  saveProgressWithEmail,
  saveProgressWithGoogle,
  verifyEmailCode,
} from './account';

function stubWindow(href: string) {
  const replaceState = vi.fn();
  vi.stubGlobal('window', {
    location: { href, origin: new URL(href).origin },
    history: { state: null, replaceState },
  });
  return replaceState;
}

describe('account flows', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('links Google to the current anonymous user rather than signing in fresh', async () => {
    stubWindow('https://tattva.test/');
    const linkIdentity = vi.fn().mockResolvedValue({ data: {}, error: null });
    getSupabaseClient.mockReturnValue({ auth: { linkIdentity } });

    await saveProgressWithGoogle();

    expect(linkIdentity).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://tattva.test' } });
  });

  it('maps an already-registered email to AccountExistsError', async () => {
    stubWindow('https://tattva.test/');
    getSupabaseClient.mockReturnValue({
      auth: { updateUser: vi.fn().mockResolvedValue({ data: {}, error: { code: 'email_exists', message: 'exists' } }) },
    });

    await expect(saveProgressWithEmail('a@b.co')).rejects.toBeInstanceOf(AccountExistsError);
  });

  it('verifies the upgrade code as an email change and the sign-in code as an email OTP', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
    getSupabaseClient.mockReturnValue({ auth: { verifyOtp } });

    await verifyEmailCode('a@b.co', '123456', 'save');
    await verifyEmailCode('a@b.co', '123456', 'signin');

    expect(verifyOtp.mock.calls.map((c) => c[0].type)).toEqual(['email_change', 'email']);
  });
});

describe('consumeAuthRedirectError', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns null and leaves the URL alone when there is no error', () => {
    const replaceState = stubWindow('https://tattva.test/?view=home');
    expect(consumeAuthRedirectError()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('reads a hash error, keeps other query params, and strips the error', () => {
    const replaceState = stubWindow(
      'https://tattva.test/?view=home#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked',
    );

    expect(consumeAuthRedirectError()).toEqual({
      code: 'identity_already_exists',
      message: 'Identity is already linked',
    });
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?view=home');
  });
});
