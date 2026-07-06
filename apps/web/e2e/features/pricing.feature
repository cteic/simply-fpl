Feature: Pricing page

  Scenario: Pricing page renders without errors
    Given I am on the prices page
    Then the page should load successfully

  Scenario: Prices page shows player price data
    Given the Worker returns bootstrap static data with player prices
    When I visit the prices page
    Then the page should display without a fatal error
