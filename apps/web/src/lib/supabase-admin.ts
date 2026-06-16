import { createClient } from '@supabase/supabase-js';

import type { Database } from '@simplyfpl/types';

export function getSupabaseAdminClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin env vars not set');
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
