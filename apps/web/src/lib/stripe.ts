import Stripe from 'stripe';

import { getStripeEnv } from './env';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeEnv().secretKey, {
      apiVersion: '2026-05-27.dahlia',
    });
  }
  return _stripe;
}
