# apps/web — Next.js 15 (App Router)

The primary launch target. A thin shell that composes `packages/features` and
`packages/ui`.

## Rules

- Thin shell: routing, layouts, env config, platform-specific concerns only.
- A page component runs ~30–50 lines. Larger than that means logic belongs in
  `features` or composition belongs in `ui`.
- No fetch calls or API clients here — they live in `fpl-client`, or `features`
  if they need React.
- Apps depend on packages; packages never depend on apps.

## Supabase

- Client-side: `getSupabaseClient()` from `src/lib/supabase.ts`
- Server-side (route handlers, server components): `getSupabaseServerClient()`
  from `src/lib/supabase-server.ts`
- Admin (webhooks only, service-role key): `getSupabaseAdminClient()`
- RLS is enabled. Never bypass it outside the admin client in webhooks.

## Stripe

- Checkout: POST `/api/stripe/checkout` → Stripe → webhook updates Supabase.
- Webhook handler: `src/app/api/stripe/webhook/route.ts`
- Price IDs come from env: `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_SECRET_KEY` is server-only and must never reach the client bundle.

## E2E

Playwright + `playwright-bdd` in `e2e/features/`, running on push to `main`.
