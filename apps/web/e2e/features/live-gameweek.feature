Feature: Live gameweek view

  Scenario: Live gameweek view loads with Worker data mocked
    Given the Worker returns live gameweek data for event 1
    And the Worker returns bootstrap static data
    When I visit the rank page for manager 12345
    Then I should see the manager details on the page
