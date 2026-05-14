Feature: Home page

  Scenario: Landing page loads with SimplyFPL branding
    Given I am on the home page
    Then the page title should contain SimplyFPL

  Scenario: Home page has a manager search input
    Given I am on the home page
    Then I should see a manager ID search field
