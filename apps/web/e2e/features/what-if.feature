Feature: What-If Simulator

  Scenario: What-if panel opens when clicking the captain tile What if? button
    Given the Worker returns a live gameweek with Salah as captain scoring 4 points
    And the Worker returns bootstrap static data with Haaland in the squad
    When I visit the rank page for manager 12345
    And I click the What if? button on the captain tile
    Then the what-if panel is visible showing captain alternatives

  Scenario: Simulating a captain swap shows updated points and rank delta
    Given the Worker returns a live gameweek with Salah as captain scoring 4 points and Haaland scoring 12 points in the XI
    And the Worker returns bootstrap static data
    When I visit the rank page for manager 12345
    And I click the What if? button on the captain tile
    And I select Haaland from the what-if panel
    Then the what-if panel shows a positive points delta

  Scenario: Resetting the simulation restores the original state
    Given the Worker returns a live gameweek with Salah as captain scoring 4 points and Haaland scoring 12 points in the XI
    And the Worker returns bootstrap static data
    When I visit the rank page for manager 12345
    And I click the What if? button on the captain tile
    And I select Haaland from the what-if panel
    And I click Reset in the what-if panel
    Then the what-if panel shows no simulation result
