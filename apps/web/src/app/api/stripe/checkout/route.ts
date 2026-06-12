import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import type { Tier } from '@simplyfpl/types';

import { getStripeEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

const PLAN_IDS = [
  'pro-monthly',
  'pro-yearly',
  'pro-lifetime',
  'ultimate-monthly',
  'ultimate-yearly',
  'ultimate-lifetime',
] as const;

type PlanId = (typeof PLAN_IDS)[number];

function isPlanId(value: unknown): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}

interface CheckoutBody {
  plan: PlanId;
}

function isCheckoutBody(value: unknown): value is CheckoutBody {
  return typeof value === 'object' && value !== null && isPlanId((value as CheckoutBody).plan);
}

function priceIdForPlan(plan: PlanId, env: ReturnType<typeof getStripeEnv>): string {
  switch (plan) {
    case 'pro-monthly':
      return env.pricePROMonthly;
    case 'pro-yearly':
      return env.pricePROYearly;
    case 'pro-lifetime':
      return env.pricePROLifetime;
    case 'ultimate-monthly':
      return env.priceULTIMATEMonthly;
    case 'ultimate-yearly':
      return env.priceULTIMATEYearly;
    case 'ultimate-lifetime':
      return env.priceULTIMATELifetime;
  }
}

function tierForPlan(plan: PlanId): Tier {
  return plan.startsWith('pro') ? 'pro' : 'ultimate';
}

function isLifetime(plan: PlanId): boolean {
  return plan.endsWith('lifetime');
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isCheckoutBody(body)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const { plan } = body;
  const env = getStripeEnv();
  const priceId = priceIdForPlan(plan, env);
  const targetTier = tierForPlan(plan);

  const baseUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: isLifetime(plan) ? 'payment' : 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    ...(user.email ? { customer_email: user.email } : {}),
    success_url: `${baseUrl}/settings?checkout=success`,
    cancel_url: `${baseUrl}/upgrade`,
    metadata: { user_id: user.id, target_tier: targetTier },
  });

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
