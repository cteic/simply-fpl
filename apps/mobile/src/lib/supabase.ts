import * as SecureStore from 'expo-secure-store';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@simplyfpl/types';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// The magic-link callback exchanges a `?code=` for a session, which only the PKCE flow returns.
// supabase-js defaults to the implicit flow, which puts tokens in the URL fragment instead.
export const SUPABASE_AUTH_OPTIONS = {
  storage: ExpoSecureStoreAdapter,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
  flowType: 'pkce',
} satisfies NonNullable<Parameters<typeof createClient>[2]>['auth'];

export const supabaseClient = createClient<Database>(
  process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? PLACEHOLDER_URL,
  process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? PLACEHOLDER_KEY,
  { auth: SUPABASE_AUTH_OPTIONS }
);
