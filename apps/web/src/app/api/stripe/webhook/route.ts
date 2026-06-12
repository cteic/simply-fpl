import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import type Stripe from 'stripe';

import type { Tier } from '@simplyfpl/types';

import { getStripeEnv } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'edge';

function tierFromPriceId(priceId: string, env: ReturnType<typeof getStripeEnv>): Tier | null {
  if (
    priceId === env.pricePROMonthly ||
    priceId === env.pricePROYearly ||
    priceId === env.pricePROLifetime
  ) {
    return 'pro';
  }
  if (
    priceId === env.priceULTIMATEMonthly ||
    priceId === env.priceULTIMATEYearly ||
    priceId === env.priceULTIMATELifetime
  ) {
    return 'ultimate';
  }
  return null;
}

async function markProcessed(eventId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from('stripe_events').insert({ id: eventId });
  return !error;
}

async function setProfileTier(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  tier: Tier,
  customerId?: string,
  subscriptionId?: string | null
) {
  const update: {
    tier: Tier;
    stripe_customer_id?: string;
    stripe_subscription_id?: string | null;
  } = { tier };
  if (customerId) update.stripe_customer_id = customerId;
  if (subscriptionId !== undefined) update.stripe_subscription_id = subscriptionId;
  await admin.from('profiles').update(update).eq('id', userId);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.['user_id'];
  const targetTier = session.metadata?.['target_tier'] as Tier | undefined;

  if (!userId || !targetTier) return;

  const admin = getSupabaseAdminClient();
  const customerId = typeof session.customer === 'string' ? session.customer : undefined;
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : undefined;

  // setProfileTier with subscriptionId=null clears any prior subscription reference (covers lifetime mode).
  await setProfileTier(admin, userId, targetTier, customerId, subscriptionId ?? null);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  env: ReturnType<typeof getStripeEnv>
) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
  if (!customerId) return;

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return;

  const tier = tierFromPriceId(priceId, env);
  if (!tier) return;

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!profile) return;

  await setProfileTier(admin, profile.id, tier, customerId, subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;
  if (!customerId) return;

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!profile) return;

  await admin
    .from('profiles')
    .update({ tier: 'free', stripe_subscription_id: null })
    .eq('id', profile.id);
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const env = getStripeEnv();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(rawBody, sig, env.webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const processed = await markProcessed(event.id);
  if (!processed) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, env);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        break;
    }
  } catch {
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
