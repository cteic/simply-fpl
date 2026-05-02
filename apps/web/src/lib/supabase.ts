import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@simplyfpl/types';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!client) {
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || PLACEHOLDER_URL;
    const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || PLACEHOLDER_KEY;
    client = createBrowserClient<Database>(url, key);
  }
  return client;
}
