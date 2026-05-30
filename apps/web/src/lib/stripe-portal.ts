export function readStripePortalUrl(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('url' in value)) return null;

  const url = value.url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

export function billingPortalReturnUrl(requestUrl: string): string {
  const { origin } = new URL(requestUrl);
  return `${origin}/settings`;
}
