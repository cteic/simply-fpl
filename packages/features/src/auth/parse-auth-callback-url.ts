type AuthCallbackResult =
  | { type: 'pkce'; code: string }
  | { type: 'tokens'; accessToken: string; refreshToken: string }
  | { type: 'error'; error: string; errorDescription: string | null }
  | { type: 'invalid' };

export function parseAuthCallbackUrl(url: string): AuthCallbackResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { type: 'invalid' };
  }

  const error = parsed.searchParams.get('error');
  if (error) {
    return {
      type: 'error',
      error,
      errorDescription: parsed.searchParams.get('error_description'),
    };
  }

  const code = parsed.searchParams.get('code');
  if (code) {
    return { type: 'pkce', code };
  }

  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    return { type: 'tokens', accessToken, refreshToken };
  }

  return { type: 'invalid' };
}
