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

export const supabaseClient = createClient<Database>(
  process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? PLACEHOLDER_URL,
  process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? PLACEHOLDER_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
