-- Tier system + Frank AI coach query log
-- Three tiers: free, pro, ultimate
--   free      — weekly KV-cached meta advice (shared payload)
--   pro       — same as free + Pro features (notifications when shipped)
--   ultimate  — Pro features + per-user on-demand Frank queries
-- Stripe wiring (Pro Monthly/Yearly/Lifetime + Ultimate Monthly/Yearly/Lifetime)
-- is in a separate PR; this migration only adds the column + table the
-- webhook handler and Frank route will read/write.

alter table public.profiles
  add column tier text not null default 'free'
    check (tier in ('free','pro','ultimate'));

-- Backfill: any existing rows with is_pro = true become 'pro' (lifetime).
-- is_pro stays for now as the legacy gate; the new code reads `tier`.
update public.profiles set tier = 'pro' where is_pro = true;

create table public.frank_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  response jsonb,
  model text,
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz not null default now()
);

create index frank_queries_user_id_created_at_idx
  on public.frank_queries (user_id, created_at desc);

alter table public.frank_queries enable row level security;

create policy "frank_queries readable by owner"
  on public.frank_queries for select
  using (auth.uid() = user_id);

-- No public insert policy — the /api/frank/ask route inserts via the
-- service_role client, bypassing RLS.
