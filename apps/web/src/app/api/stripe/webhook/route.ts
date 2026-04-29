import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!);
const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET']!;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await getSupabaseAdminClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Look up user by Stripe customer ID
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!existingSub) {
          console.warn('No user found for Stripe customer:', customerId);
          break;
        }

        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        const plan = subscription.items.data[0]?.price.lookup_key ?? 'pro_monthly';

        await supabase
          .from('subscriptions')
          .upsert({
            user_id: existingSub.user_id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            status: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing',
            plan: plan as 'pro_monthly' | 'pro_yearly',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });

        // Update profile is_pro flag
        await supabase
          .from('profiles')
          .update({
            is_pro: isActive,
            pro_expires_at: isActive
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          })
          .eq('id', existingSub.user_id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (existingSub) {
          await supabase
            .from('profiles')
            .update({ is_pro: false, pro_expires_at: null })
            .eq('id', existingSub.user_id);

          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const userId = session.metadata?.['userId'];

        if (!userId) {
          console.warn('checkout.session.completed missing userId metadata');
          break;
        }

        // Link the Stripe customer ID to the user
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            plan: 'pro_monthly',
            current_period_end: new Date().toISOString(), // will be updated by subscription event
          });

        break;
      }

      default:
        // Unhandled event type — safe to ignore
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
