import { createClient } from '@supabase/supabase-js';

import type { Database } from '@simplyfpl/types';

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-service-role-key';

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] || PLACEHOLDER_URL;
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'] || PLACEHOLDER_KEY;
    adminClient = createClient<Database>(url, key, {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}
