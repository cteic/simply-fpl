Feature: Threats visual regression

  Visual guardrail for /threats (PR #204, feat/threats-eo-scaffolds). Snapshots
  the placeholder-data state (5 hardcoded threat rows) which is the state
  shipping until cohort aggregates wire-up lands. Asserts no pageerror during
  hydration to catch app-crash regressions like the 2026-05-15 Tamagui v2 bug.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And the Worker returns no cohort aggregates for any gameweek

  Scenario: Threats page renders placeholder data with a saved team
    Given a team id is saved in storage
    When I visit the threats page
    Then no page error should have occurred
    And the rendered page matches the snapshot "threats-placeholder-saved-team"
