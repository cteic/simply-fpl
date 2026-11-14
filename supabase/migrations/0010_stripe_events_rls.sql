-- stripe_events is the webhook's idempotency log. Without RLS, the anon and authenticated
-- roles can read, insert and delete rows through PostgREST, so a deleted row lets a Stripe
-- retry run twice. Enable RLS with no policies: only the service_role client, which bypasses
-- RLS, touches this table.
alter table public.stripe_events enable row level security;
