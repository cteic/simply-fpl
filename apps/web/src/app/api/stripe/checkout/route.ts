import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!);

// Set these in Stripe dashboard and add price IDs to env
const PRICE_IDS = {
  pro_monthly: process.env['STRIPE_PRICE_PRO_MONTHLY']!,
  pro_yearly: process.env['STRIPE_PRICE_PRO_YEARLY']!,
};

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { plan: 'pro_monthly' | 'pro_yearly' };
  const priceId = PRICE_IDS[body.plan];

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env['NEXT_PUBLIC_APP_URL']}/settings?upgrade=success`,
    cancel_url: `${process.env['NEXT_PUBLIC_APP_URL']}/upgrade`,
    metadata: { userId: user.id },
    subscription_data: {
      metadata: { userId: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
