Feature: Threats — playing-status filters and live contribution metric

  Scenario: A player in an in-progress fixture is Playing
    Given a threat whose team is in a fixture that has kicked off but not finished
    When I compute the threats
    Then that threat's playing status should be "playing"
    And the "Playing" filter should include that threat

  Scenario: A player in a finished fixture with no minutes Didn't Play
    Given a threat whose team's fixture has finished and the player logged 0 minutes
    When I compute the threats
    Then that threat's playing status should be "didnt-play"
    And the "Didn't Play" filter should include that threat

  Scenario: A player in a finished fixture with minutes has Played
    Given a threat whose team's fixture has finished and the player logged minutes
    When I compute the threats
    Then that threat's playing status should be "played"

  Scenario: A player whose fixture has not started is To Play
    Given a threat whose team's fixture has not kicked off yet
    When I compute the threats
    Then that threat's playing status should be "to-play"

  Scenario: The All filter shows every threat regardless of status
    Given threats with a mix of playing statuses
    When I compute the threats
    Then the "All" filter should include every threat

  Scenario: Points lost to a threat reflect effective ownership and live points
    Given a threat owned by the whole cohort that has scored points this gameweek
    When I compute the threats
    Then the points lost to that threat should equal effective ownership times live points
    And the score percentage should be the player's share of the cohort average
