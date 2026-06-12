export { AuthProvider, computeIsPro, useAuth } from './use-auth';
export { parseAuthCallbackUrl } from './parse-auth-callback-url';
// StubAuthProvider is intentionally NOT exported from the barrel — tests import
// via the direct path `./stub-auth-provider` so the supabase-js dep is not
// pulled into production bundles.
