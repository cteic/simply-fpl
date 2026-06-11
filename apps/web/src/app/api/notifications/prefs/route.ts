import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const DEFAULT_PREFS = {
  deadline_reminder: true,
  captain_scored: true,
  bonus_confirmed: false,
  price_drop: false,
  rank_swing: false,
  rank_swing_threshold: 5000,
};

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from('notification_prefs')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(data ?? DEFAULT_PREFS);
}

export async function PUT(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  if (!profile || !['pro', 'ultimate'].includes(profile.tier)) {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const updates = body as Record<string, unknown>;
  const safeUpdate: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (typeof updates['deadline_reminder'] === 'boolean')
    safeUpdate['deadline_reminder'] = updates['deadline_reminder'];
  if (typeof updates['captain_scored'] === 'boolean')
    safeUpdate['captain_scored'] = updates['captain_scored'];

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from('notification_prefs')
    .upsert(safeUpdate, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: 'Failed to update prefs' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
