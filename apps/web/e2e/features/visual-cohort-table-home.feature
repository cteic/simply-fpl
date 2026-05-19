Feature: Home cohort comparison table visual regression

  The cohort comparison table renders on / below the scoreboard whenever a team
  ID is saved (PR #201, feat/gw38-dress-rehearsal). The placeholder-data state
  is already covered by the home-with-team snapshot in prod-routes-render
  (visually identical full page); this feature adds a forward-looking gate for
  the real-data state, which the home view will switch to once the cohort
  aggregates wire-up ships. Marked @fixme until that wire-up lands — at that
  point drop the tag and rerun with --update-snapshots to commit the gate.

  Background:
    Given the Worker returns deterministic FPL fixtures

  @fixme
  Scenario: Home cohort table renders with real cohort aggregate data
    Given a team id is saved in storage
    And the Worker returns deterministic cohort aggregates for gameweek 37
    When I visit the home page
    Then no page error should have occurred
    And the rendered page matches the snapshot "home-cohort-real-data"
