-- Stripe integration: customer/subscription tracking + event idempotency log

alter table public.profiles
  add column stripe_customer_id text,
  add column stripe_subscription_id text;

create unique index profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- stripe_events: one row per processed Stripe event ID (idempotency guard).
-- The webhook handler inserts the event ID before updating any rows; a unique
-- constraint violation means the event was already processed, so the handler
-- skips the update and returns 200 immediately.
create table public.stripe_events (
  id text primary key,
  processed_at timestamptz not null default now()
);

-- No RLS on stripe_events — only the service_role client writes here.
