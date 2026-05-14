import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { FEATURE_AUTH } from '@/lib/feature-flags';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  if (!FEATURE_AUTH) {
    return NextResponse.redirect(`${origin}/`);
  }

  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/leagues';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
