import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export const ALLOWED_PUSH_HOSTS = ['googleapis.com', 'mozilla.com', 'apple.com'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAllowedEndpoint(endpoint: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return ALLOWED_PUSH_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  );
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const endpoint = body['endpoint'];
  const p256dh = body['p256dh'];
  const auth = body['auth'];

  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!isAllowedEndpoint(endpoint)) {
    return NextResponse.json({ error: 'endpoint_not_allowed' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth_key: auth,
      platform: 'web',
    },
    { onConflict: 'user_id,endpoint' }
  );

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
