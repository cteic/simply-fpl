Feature: Multi-league visibility by tier

  Scenario: Free user with 2 tracked leagues sees only the primary league
    Given a free user
    And the user has 2 tracked leagues
    When I get the visible leagues
    Then only 1 league should be visible
    And it should be the primary league

  Scenario: Pro user with 2 tracked leagues sees all leagues
    Given a pro user
    And the user has 2 tracked leagues
    When I get the visible leagues
    Then 2 leagues should be visible

  Scenario: Ultimate user with 2 tracked leagues sees all leagues
    Given an ultimate user
    And the user has 2 tracked leagues
    When I get the visible leagues
    Then 2 leagues should be visible

  Scenario: Free user with no tracked leagues sees no leagues
    Given a free user
    And the user has 0 tracked leagues
    When I get the visible leagues
    Then 0 leagues should be visible
