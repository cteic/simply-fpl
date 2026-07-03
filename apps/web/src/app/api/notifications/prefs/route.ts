import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

const DEFAULT_PREFS = {
  deadline_reminder: true,
  captain_scored: true,
  bonus_confirmed: false,
  price_drop: false,
  rank_swing: false,
  rank_swing_threshold: 5000,
  goal_scored: true,
  assist: true,
  red_card: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
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
  const safeUpdate: {
    user_id: string;
    updated_at: string;
    deadline_reminder?: boolean;
    captain_scored?: boolean;
    bonus_confirmed?: boolean;
    goal_scored?: boolean;
    assist?: boolean;
    red_card?: boolean;
    rank_swing?: boolean;
    rank_swing_threshold?: number;
    quiet_hours_start?: number | null;
    quiet_hours_end?: number | null;
  } = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (typeof updates['deadline_reminder'] === 'boolean')
    safeUpdate.deadline_reminder = updates['deadline_reminder'];
  if (typeof updates['captain_scored'] === 'boolean')
    safeUpdate.captain_scored = updates['captain_scored'];
  if (typeof updates['bonus_confirmed'] === 'boolean')
    safeUpdate.bonus_confirmed = updates['bonus_confirmed'];
  if (typeof updates['goal_scored'] === 'boolean') safeUpdate.goal_scored = updates['goal_scored'];
  if (typeof updates['assist'] === 'boolean') safeUpdate.assist = updates['assist'];
  if (typeof updates['red_card'] === 'boolean') safeUpdate.red_card = updates['red_card'];
  if (typeof updates['rank_swing'] === 'boolean') safeUpdate.rank_swing = updates['rank_swing'];
  if (typeof updates['rank_swing_threshold'] === 'number')
    safeUpdate.rank_swing_threshold = updates['rank_swing_threshold'];
  if (
    updates['quiet_hours_start'] === null ||
    (typeof updates['quiet_hours_start'] === 'number' &&
      updates['quiet_hours_start'] >= 0 &&
      updates['quiet_hours_start'] <= 23)
  )
    safeUpdate.quiet_hours_start = updates['quiet_hours_start'] as number | null;
  if (
    updates['quiet_hours_end'] === null ||
    (typeof updates['quiet_hours_end'] === 'number' &&
      updates['quiet_hours_end'] >= 0 &&
      updates['quiet_hours_end'] <= 23)
  )
    safeUpdate.quiet_hours_end = updates['quiet_hours_end'] as number | null;

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from('notification_prefs')
    .upsert(safeUpdate, { onConflict: 'user_id' });

  if (error) {
    return NextResponse.json({ error: 'Failed to update prefs' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
