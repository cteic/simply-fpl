Feature: Cohort live-rank estimate tracks the gw36 replay

  The cohort engine replays the committed gw36 recording at 10x speed and
  estimates the manager's live overall rank against the synthetic manager
  distribution. The estimate must track the offline-derived expected curve
  during the match and converge to the official end-of-gameweek rank.

  Scenario: The live-rank estimate tracks the expected curve at T+30 minutes
    Given the gw36 replay bundle is loaded
    When the cohort engine replays the recording at 10x speed
    Then the replay cadence is compressed 10x against wall-clock time
    And the live-rank estimate at T+30 minutes is within 5% of the expected curve

  Scenario: The live-rank estimate converges to the official rank at full-time
    Given the gw36 replay bundle is loaded
    When the cohort engine replays the recording at 10x speed
    Then the final live-rank estimate is within 1% of the official end-of-gameweek rank
    And the manager has climbed above the pre-gameweek rank
