-- Web push notifications: subscriptions, per-user prefs, and audit log.
-- Phase 1 ships web-only. platform check intentionally restricts to 'web' for now;
-- extend to ('web','ios','android') when Expo push lands.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('web')),
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  last_error text,
  unique (user_id, endpoint)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Users can read their own subscriptions; insert/update/delete is service_role only
-- (the /api/notifications/subscribe route uses the admin client).
create policy "push_subscriptions readable by owner"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create table public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  deadline_reminder bool not null default true,
  captain_scored bool not null default true,
  bonus_confirmed bool not null default false,
  price_drop bool not null default false,
  rank_swing bool not null default false,
  rank_swing_threshold int not null default 5000,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy "notification_prefs readable and writable by owner"
  on public.notification_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.notification_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  event text not null,
  payload jsonb,
  sent_at timestamptz not null default now(),
  clicked_at timestamptz
);

create index notification_log_user_sent_idx on public.notification_log(user_id, sent_at desc);
create index notification_log_event_sent_idx on public.notification_log(event, sent_at desc);

alter table public.notification_log enable row level security;

-- Users can read their own log entries; only service_role inserts.
create policy "notification_log readable by owner"
  on public.notification_log for select
  using (auth.uid() = user_id);
