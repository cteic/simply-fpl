Feature: Cohort tier access control

  top_10k is the free-tier cohort. Richer tiers (top_100k, overall, legendary)
  require a pro or ultimate subscription — enforced by Supabase RLS on
  cohort_snapshots and cohort_player_stats (migration 0007_fix_cohort_rls.sql).

  Scenario: Free user may read top_10k cohort rows
    Given a signed-in user with tier 'free'
    When they request cohort data for tier 'top_10k'
    Then access is granted

  Scenario: Free user is denied 'overall' cohort rows
    Given a signed-in user with tier 'free'
    When they request cohort data for tier 'overall'
    Then access is denied

  Scenario: Pro user may read 'overall' cohort rows
    Given a signed-in user with tier 'pro'
    When they request cohort data for tier 'overall'
    Then access is granted

  Scenario: Ultimate user may read 'legendary' cohort rows
    Given a signed-in user with tier 'ultimate'
    When they request cohort data for tier 'legendary'
    Then access is granted
