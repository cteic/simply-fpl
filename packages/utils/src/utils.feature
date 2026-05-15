Feature: Utility helpers

  Scenario: Format rank 1 as 1st
    Given a rank value of 1
    When I format the rank
    Then the result should be 1st

  Scenario: Format rank 11 as 11th
    Given a rank value of 11
    When I format the rank
    Then the result should be 11th

  Scenario: Format rank 22 as 22nd
    Given a rank value of 22
    When I format the rank
    Then the result should be 22nd

  Scenario: Format zero or negative rank as a dash
    Given a rank value of 0
    When I format the rank
    Then the result should be —

  Scenario: Format positive rank movement with up arrow
    Given a rank movement of 500
    When I format the rank movement
    Then the result should start with an up arrow

  Scenario: Format negative rank movement with down arrow
    Given a rank movement of -300
    When I format the rank movement
    Then the result should start with a down arrow

  Scenario: Format zero rank movement as a dash
    Given a rank movement of 0
    When I format the rank movement
    Then the result should be —

  Scenario: isLiveGameweek returns true for current unfinished gameweek
    Given a gameweek that is current and not finished
    When I check if it is a live gameweek
    Then the result should be true

  Scenario: isLiveGameweek returns false for finished gameweek
    Given a gameweek that is current and finished
    When I check if it is a live gameweek
    Then the result should be false

  Scenario: Clamp keeps value within bounds
    Given a value of 150 with min 0 and max 100
    When I clamp the value
    Then the result should be 100
