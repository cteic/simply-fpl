-- Tighten cohort table RLS: non-top_10k tiers require pro or ultimate.
-- Replaces the permissive policies created in 0002_cohort_engine.sql.

drop policy if exists "cohort_snapshots readable by everyone for free tier"
  on public.cohort_snapshots;

drop policy if exists "cohort_player_stats readable by everyone for free tier"
  on public.cohort_player_stats;

create policy "cohort_snapshots read"
  on public.cohort_snapshots for select
  using (
    cohort_tier = 'top_10k'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier in ('pro', 'ultimate')
    )
  );

create policy "cohort_player_stats read"
  on public.cohort_player_stats for select
  using (
    cohort_tier = 'top_10k'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier in ('pro', 'ultimate')
    )
  );
