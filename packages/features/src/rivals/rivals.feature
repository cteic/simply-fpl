Feature: Rivals board and differentials

  Scenario: Rivals board shows live rank with correct ordering
    Given two rivals where rival A scores 60 and rival B scores 45 live
    When I compute the rivals board
    Then rival A should appear first with rank 1

  Scenario: Differentials show players unique to each manager
    Given my squad has player 10 but the rival does not
    And the rival squad has player 20 but I do not
    When I compute the differentials
    Then player 10 should be in my unique picks
    And player 20 should be in the rival unique picks

  Scenario: Differentials report same captaincy when both managers captain the same player
    Given both managers captain player 5
    When I compute the differentials
    Then the captaincy diff same flag should be true
