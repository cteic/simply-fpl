Feature: Player status change detection

  The status diff compares a previous snapshot of player statuses against the
  current bootstrap to produce a list of per-player availability changes.

  Scenario: First tick with no previous entry produces no changes
    Given a snapshot that does not contain player 42
    And the current bootstrap has player 42 as doubtful
    When detectPlayerStatusChanges is called
    Then no change is emitted for player 42

  Scenario: Newly flagged — player gains news from a clean slate
    Given a snapshot where player 10 was available (no news, status a)
    And the current bootstrap has player 10 with news "Knock" and status d
    When detectPlayerStatusChanges is called
    Then a newly_flagged change is emitted for player 10

  Scenario: Ruled out — player moves to unavailable status
    Given a snapshot where player 20 was doubtful (status d, 50% chance)
    And the current bootstrap has player 20 with status i (injured, 0% chance)
    When detectPlayerStatusChanges is called
    Then a ruled_out change is emitted for player 20

  Scenario: Upgraded — chance of playing increases while still doubtful
    Given a snapshot where player 30 was doubtful at 25% chance
    And the current bootstrap has player 30 still doubtful but at 75% chance
    When detectPlayerStatusChanges is called
    Then an upgraded change is emitted for player 30
    And the chanceOfPlaying on the change is 75

  Scenario: No change — status unchanged between ticks
    Given a snapshot where player 40 was doubtful at 50% chance
    And the current bootstrap has player 40 still doubtful at 50% chance
    When detectPlayerStatusChanges is called
    Then no change is emitted for player 40

  Scenario: Chance decreases while still doubtful — no upgraded change
    Given a snapshot where player 50 was doubtful at 75% chance
    And the current bootstrap has player 50 still doubtful but at 50% chance
    When detectPlayerStatusChanges is called
    Then no change is emitted for player 50

  Scenario: buildSnapshot captures status, news, and chance for all players
    Given a bootstrap with two players: one available and one doubtful
    When buildSnapshot is called
    Then both players appear in the snapshot with their status, news, and chance
