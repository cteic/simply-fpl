-- Cohort engine: per-(GW, tier) aggregates of picks/captains/transfers
-- See docs/rfcs/004-cohort-engine.md
-- Two tables:
--   cohort_snapshots   — append-only history, full JSONB payload per (gw, tier, captured_at)
--   cohort_player_stats — denormalised per-(gw, tier, player_id) for fast lookups

create table public.cohort_snapshots (
  id bigserial primary key,
  gw smallint not null,
  cohort_tier text not null check (cohort_tier in ('top_10k','top_100k','overall','legendary')),
  captured_at timestamptz not null default now(),
  entries_sampled integer not null default 0,
  is_complete boolean not null default false,
  payload jsonb not null
);

create index cohort_snapshots_gw_tier_captured_at_idx
  on public.cohort_snapshots (gw, cohort_tier, captured_at desc);

create table public.cohort_player_stats (
  gw smallint not null,
  cohort_tier text not null check (cohort_tier in ('top_10k','top_100k','overall','legendary')),
  player_id integer not null,
  ownership_pct numeric(5,2) not null default 0,
  captain_pct numeric(5,2) not null default 0,
  transfers_in_pct numeric(5,2) not null default 0,
  transfers_out_pct numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (gw, cohort_tier, player_id)
);

create index cohort_player_stats_ownership_idx
  on public.cohort_player_stats (gw, cohort_tier, ownership_pct desc);

create index cohort_player_stats_captain_idx
  on public.cohort_player_stats (gw, cohort_tier, captain_pct desc);

alter table public.cohort_snapshots enable row level security;
alter table public.cohort_player_stats enable row level security;

create policy "cohort_snapshots readable by everyone for free tier"
  on public.cohort_snapshots for select
  using (cohort_tier = 'top_10k' or auth.role() = 'authenticated');

create policy "cohort_player_stats readable by everyone for free tier"
  on public.cohort_player_stats for select
  using (cohort_tier = 'top_10k' or auth.role() = 'authenticated');

create trigger cohort_player_stats_set_updated_at
  before update on public.cohort_player_stats
  for each row execute function public.set_updated_at();
