import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('league_rank_alert_subs')
    .select('id,league_id,top_n,swing_n,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
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

  const { league_id, top_n, swing_n } = body as Record<string, unknown>;

  if (typeof league_id !== 'number' || !Number.isInteger(league_id) || league_id <= 0) {
    return NextResponse.json({ error: 'Invalid league_id' }, { status: 400 });
  }

  const safeTopN = typeof top_n === 'number' && Number.isInteger(top_n) && top_n > 0 ? top_n : null;
  const safeSwingN =
    typeof swing_n === 'number' && Number.isInteger(swing_n) && swing_n > 0 ? swing_n : null;

  if (safeTopN === null && safeSwingN === null) {
    return NextResponse.json(
      { error: 'At least one of top_n or swing_n must be set' },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from('league_rank_alert_subs').upsert(
    {
      user_id: user.id,
      league_id,
      top_n: safeTopN,
      swing_n: safeSwingN,
    },
    { onConflict: 'user_id,league_id' }
  );

  if (error) {
    return NextResponse.json({ error: 'Failed to save alert' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const { league_id } = body as Record<string, unknown>;

  if (typeof league_id !== 'number' || !Number.isInteger(league_id) || league_id <= 0) {
    return NextResponse.json({ error: 'Invalid league_id' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  await admin
    .from('league_rank_alert_subs')
    .delete()
    .eq('user_id', user.id)
    .eq('league_id', league_id);

  return NextResponse.json({ ok: true });
}
