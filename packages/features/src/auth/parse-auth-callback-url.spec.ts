import { describe, expect, it } from 'vitest';

import { parseAuthCallbackUrl } from './parse-auth-callback-url';

describe('parseAuthCallbackUrl', () => {
  it('returns pkce for a URL with code query param', () => {
    const result = parseAuthCallbackUrl('simplyfpl://auth/callback?code=abc123');
    expect(result).toEqual({ type: 'pkce', code: 'abc123' });
  });

  it('returns tokens for a URL with access_token + refresh_token in fragment', () => {
    const result = parseAuthCallbackUrl(
      'simplyfpl://auth/callback#access_token=tok&refresh_token=rtok&expires_in=3600'
    );
    expect(result).toEqual({ type: 'tokens', accessToken: 'tok', refreshToken: 'rtok' });
  });

  it('returns error with description when error query params are present', () => {
    const result = parseAuthCallbackUrl(
      'simplyfpl://auth/callback?error=access_denied&error_description=Email+link+is+invalid'
    );
    expect(result).toEqual({
      type: 'error',
      error: 'access_denied',
      errorDescription: 'Email link is invalid',
    });
  });

  it('returns error with null description when error_description is absent', () => {
    const result = parseAuthCallbackUrl('simplyfpl://auth/callback?error=access_denied');
    expect(result).toEqual({ type: 'error', error: 'access_denied', errorDescription: null });
  });

  it('returns invalid for a URL with no auth params', () => {
    const result = parseAuthCallbackUrl('simplyfpl://auth/callback');
    expect(result).toEqual({ type: 'invalid' });
  });

  it('returns invalid for a malformed URL string', () => {
    const result = parseAuthCallbackUrl('not-a-url');
    expect(result).toEqual({ type: 'invalid' });
  });

  it('returns invalid when fragment has access_token but no refresh_token', () => {
    const result = parseAuthCallbackUrl('simplyfpl://auth/callback#access_token=tok');
    expect(result).toEqual({ type: 'invalid' });
  });
});
