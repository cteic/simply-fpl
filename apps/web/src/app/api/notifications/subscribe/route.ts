import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

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

  const { endpoint, p256dh, auth } = body as Record<string, unknown>;

  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid subscription fields' }, { status: 400 });
  }

  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    return NextResponse.json({ error: 'Invalid endpoint URL' }, { status: 400 });
  }
  const ALLOWED_PUSH_HOSTS =
    /^(.+\.googleapis\.com|.+\.push\.services\.mozilla\.com|.+\.push\.apple\.com)$/;
  if (parsedEndpoint.protocol !== 'https:' || !ALLOWED_PUSH_HOSTS.test(parsedEndpoint.hostname)) {
    return NextResponse.json({ error: 'Endpoint host not allowed' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      platform: 'web',
      endpoint,
      p256dh,
      auth_key: auth,
    },
    { onConflict: 'user_id,endpoint' }
  );

  if (error) {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
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

  const { endpoint } = body as Record<string, unknown>;

  if (typeof endpoint !== 'string') {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  await admin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);

  return NextResponse.json({ ok: true });
}
