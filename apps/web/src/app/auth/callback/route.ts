import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const userId = sessionData.session?.user.id;
  if (!userId) {
    return NextResponse.redirect(`${origin}/`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('fpl_entry_id')
    .eq('id', userId)
    .maybeSingle<{ fpl_entry_id: number | null }>();

  if (!profile?.fpl_entry_id) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}/`);
}
