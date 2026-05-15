Feature: Manager search

  Scenario: Navigating to a manager rank page shows manager info
    Given the Worker returns entry data for manager 12345
    When I navigate directly to the rank page for manager 12345
    Then the page should load without a navigation error
