Feature: Fixture planner grid

  Scenario: Grid returns the requested number of gameweeks
    Given a squad of 11 starters and fixtures for 5 gameweeks from GW1
    When I compute the planner grid starting at GW1 with count 5
    Then the grid should contain exactly 5 cells

  Scenario: Double gameweek cell is labelled correctly
    Given a starter who has two fixtures in GW1
    When I compute the planner grid starting at GW1 with count 1
    Then the GW1 cell should be marked as a double gameweek

  Scenario: Blank gameweek cell is labelled correctly
    Given a starter who has no fixture in GW1
    When I compute the planner grid starting at GW1 with count 1
    Then the GW1 cell should be marked as a blank

  Scenario: Live gameweek label includes the Live indicator
    Given bootstrap data marking GW2 as current and active
    When I compute the planner grid starting at GW2 with count 1
    Then the GW2 cell label should include Live

  Scenario: Bench players at positions 12-15 are excluded from the planner grid
    Given a squad of 15 players where positions 12-15 are bench players
    When I compute the planner grid starting at GW1 with count 1
    Then the grid cell should contain exactly 11 players
