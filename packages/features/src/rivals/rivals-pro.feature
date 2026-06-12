Feature: Rivals Pro/free tier behaviour

  Scenario: Free user is limited to one tracked league
    Given a user on the free tier
    When I check the maximum number of leagues they can track
    Then the limit should be 1

  Scenario: Pro user can track multiple leagues
    Given a user on the pro tier
    When I check the maximum number of leagues they can track
    Then the limit should be greater than 1

  Scenario: Ultimate user can track multiple leagues
    Given a user on the ultimate tier
    When I check the maximum number of leagues they can track
    Then the limit should be greater than 1
