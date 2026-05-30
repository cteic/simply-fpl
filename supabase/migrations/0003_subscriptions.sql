create extension if not exists "pgcrypto";

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null check (status in ('active', 'canceled', 'past_due', 'trialing')),
  plan text not null check (plan in ('pro_monthly', 'pro_yearly')),
  current_period_end timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions(user_id);

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions(stripe_customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions readable by owner"
  on public.subscriptions;

create policy "subscriptions readable by owner"
  on public.subscriptions for select
  using (auth.uid() = user_id);
