Feature: Cohort live-rank estimation via gameweek replay

  Replaying a recorded gameweek through the real live-rank logic gives cohort
  work a reproducible green/red signal without a live gameweek, a worker or a
  browser (RFC 005, issue #173). The harness scores my entry against a sampled
  manager pool frame-by-frame and compares the trajectory to the committed
  expected-rank curve.

  Background:
    Given the gw37 simulator recording, test team and synthetic manager pool

  Scenario: Live rank estimate tracks the expected curve mid-gameweek
    Given my pre-gameweek overall rank is 38859
    When 30 minutes of the simulated gameweek have replayed
    Then my live rank estimate is within 5% of the expected curve

  Scenario: Live rank converges to the official rank at full-time
    Given my pre-gameweek overall rank is 38859
    When the simulated gameweek has fully replayed
    Then my live rank estimate matches the official end-of-gameweek rank within 1%
    And my final live rank is better than my pre-gameweek rank

  Scenario: Replaying the recording reproduces the committed expected curve
    When I replay the full recording through the live-rank logic
    Then every frame matches the committed expected-rank curve
