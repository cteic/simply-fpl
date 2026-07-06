Feature: Leagues route with mini-league tabs

  Leagues live on their own /leagues route. When a saved team belongs to
  several mini-leagues, the page shows a tab per league and swaps the live
  standings table when a tab is selected. Clicking a rival opens the
  head-to-head route, which must keep working.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And a team with multiple mini-leagues is saved in storage

  Scenario: Mini-league tabs switch between the manager's leagues
    When I visit the leagues page
    Then no page error should have occurred
    And I see a tab for each of my mini-leagues
    And the manager "P. O'Connor" is shown in the standings
    When I switch to the "The Office Bantz" league tab
    Then the manager "Karen K." is shown in the standings

  Scenario: Clicking a rival opens the head-to-head route
    When I visit the leagues page
    And I open a head-to-head against a rival in the standings
    Then the head-to-head route for my team opens

  Scenario: Opening Rivals from a league lands on the rivals route
    When I visit the leagues page
    And I switch to the "Ireland" league tab
    And I open the rivals view for the active league
    Then no page error should have occurred
    And the rivals route for that league opens
