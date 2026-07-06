function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export function getStripeEnv() {
  return {
    secretKey: requireEnv('STRIPE_SECRET_KEY'),
    webhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET'),
    pricePROMonthly: requireEnv('STRIPE_PRICE_PRO_MONTHLY'),
    pricePROYearly: requireEnv('STRIPE_PRICE_PRO_YEARLY'),
    pricePROLifetime: requireEnv('STRIPE_PRICE_PRO_LIFETIME'),
    priceULTIMATEMonthly: requireEnv('STRIPE_PRICE_ULTIMATE_MONTHLY'),
    priceULTIMATEYearly: requireEnv('STRIPE_PRICE_ULTIMATE_YEARLY'),
    priceULTIMATELifetime: requireEnv('STRIPE_PRICE_ULTIMATE_LIFETIME'),
  };
}
