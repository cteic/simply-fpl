Feature: Live rank header + scoreboard unify

  Regression for issue #195 — the header RANK chip and the main scoreboard
  must show the same value. While the live snapshot is still loading both
  must render the "—" placeholder rather than a pre-GW rank.

  Scenario: Header chip and scoreboard both show placeholder, then snap to the same number
    Given the Worker returns deterministic FPL fixtures with live snapshot delayed by 800ms
    And a team id is saved in storage for the live rank loading scenario
    When I visit the home page for the live rank loading scenario
    Then the header rank pill and the main scoreboard both show the placeholder
    And the loading state matches the snapshot "live-rank-loading-placeholder"
    When the live snapshot arrives
    Then the header rank pill and the main scoreboard show the same live rank
    And the resolved state matches the snapshot "live-rank-loading-resolved"
