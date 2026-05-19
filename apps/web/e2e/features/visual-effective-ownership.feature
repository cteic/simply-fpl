Feature: Effective ownership visual regression

  Visual guardrail for /effective-ownership (PR #204, feat/threats-eo-scaffolds).
  Snapshots the placeholder-data state (top 10 rows of hardcoded EO splits)
  which is the state shipping until cohort aggregates wire-up lands. Asserts no
  pageerror during hydration to catch app-crash regressions like the 2026-05-15
  Tamagui v2 bug.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And the Worker returns no cohort aggregates for any gameweek

  Scenario: Effective ownership page renders placeholder data
    Given no team is saved in storage
    When I visit the effective ownership page
    Then no page error should have occurred
    And the rendered page matches the snapshot "effective-ownership-placeholder"
