import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { billingPortalReturnUrl, readStripePortalUrl } from '@/lib/stripe-portal';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

interface ErrorBody {
  error: string;
}

function jsonError(error: string, status: number): NextResponse<ErrorBody> {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];
  if (!stripeSecretKey) {
    return jsonError('Stripe is not configured.', 503);
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError('Sign in to manage billing.', 401);
  }

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return jsonError('Unable to load subscription.', 500);
  }

  if (!subscription?.stripe_customer_id) {
    return jsonError('No Stripe customer is linked to this account.', 404);
  }

  const body = new URLSearchParams({
    customer: subscription.stripe_customer_id,
    return_url: billingPortalReturnUrl(request.url),
  });

  const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  let stripePayload: unknown = null;
  try {
    stripePayload = await stripeResponse.json();
  } catch {
    stripePayload = null;
  }

  const url = readStripePortalUrl(stripePayload);
  if (!stripeResponse.ok || !url) {
    return jsonError('Unable to open billing portal.', 502);
  }

  return NextResponse.json({ url });
}
