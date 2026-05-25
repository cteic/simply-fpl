Feature: Cohort sampler builds a usable sample within a gameweek

  The top_10k tier used to crawl all 200 standings pages (~10,000 entries) at
  30 requests per tick, taking ~55 hours to finish — far longer than a
  gameweek — and only flushed a snapshot on full completion. The Top10k toggle
  therefore never had data. The sampler now fetches a representative slice with
  a larger per-tick budget and flushes the partial snapshot every tick so the
  toggle fills in as the sample builds.

  Scenario: top_10k samples a representative slice that completes within a gameweek
    Given the configured cohort tiers
    Then top_10k fetches a representative sample between 1000 and 2500 entries
    And top_10k completes in at most 12 ticks
    And the live and idle tier budgets stay within the Worker subrequest ceiling
    And the legendary tier budget is unchanged

  Scenario: each tick flushes a partial snapshot so the toggle shows the sample as it builds
    Given a live gameweek with the FPL standings and picks endpoints mocked
    When the cohort cron runs once
    Then a partial top_10k snapshot is flushed with is_complete false
    And the served top_10k snapshot in KV has a non-zero sample

  Scenario: the sample is marked complete once the full pass finishes
    Given a live gameweek with the FPL standings and picks endpoints mocked
    When the cohort cron runs until top_10k completes
    Then top_10k completed within a gameweek's worth of ticks
    And the final top_10k snapshot is flushed with is_complete true and a full sample
    And partial top_10k snapshots were flushed before completion
