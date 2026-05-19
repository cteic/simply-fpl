Feature: Rivals view

  Scenario: Rivals page renders the user row alongside rivals above and below
    Given my team ID 12345 is stored in local storage
    And the Worker returns bootstrap static data for the rivals view
    And the Worker returns live gameweek data for the rivals view
    And the Worker returns a 20-manager league standings response for league 999
    And the Worker returns picks for every rival entry in the window
    When I visit the rivals page for league 999
    Then I should see my team row highlighted as the You row
    And I should see managers above and below me in the rivals board
