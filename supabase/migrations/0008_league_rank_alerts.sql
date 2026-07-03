-- Per-league rank alert subscriptions + extend notification_prefs with
-- player-event toggles and optional quiet hours.

alter table public.notification_prefs
  add column if not exists goal_scored bool not null default true,
  add column if not exists assist bool not null default true,
  add column if not exists red_card bool not null default true,
  add column if not exists quiet_hours_start smallint check (quiet_hours_start between 0 and 23),
  add column if not exists quiet_hours_end smallint check (quiet_hours_end between 0 and 23);

create table public.league_rank_alert_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id bigint not null,
  top_n smallint check (top_n > 0),
  swing_n smallint check (swing_n > 0),
  created_at timestamptz not null default now(),
  unique (user_id, league_id)
);

create index league_rank_alert_subs_user_id_idx
  on public.league_rank_alert_subs(user_id);

alter table public.league_rank_alert_subs enable row level security;

create policy "league_rank_alert_subs owner rw"
  on public.league_rank_alert_subs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
