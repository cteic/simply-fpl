import { NextResponse } from 'next/server';

import { hashUserId } from '@/lib/analytics';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET() {
  const salt = process.env['POSTHOG_HASH_SALT'];
  if (!salt) {
    return NextResponse.json({ id: null });
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ id: null });
  }

  const id = await hashUserId(salt, user.id);
  return NextResponse.json({ id }, { headers: { 'Cache-Control': 'no-store, private' } });
}
