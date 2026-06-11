Feature: Analytics consent

  SimplyFPL does not load PostHog until the visitor explicitly accepts the
  consent banner. Declined consent is persisted in a cookie so the banner
  never reappears.

  Scenario: First-time visitor sees the consent banner and PostHog is dormant
    Given I have no analytics consent cookie
    When I visit the home page
    Then the analytics consent banner is visible
    And the ph_consent cookie is not set

  Scenario: Accepting consent dismisses the banner and records the decision
    Given I have no analytics consent cookie
    When I visit the home page
    And I click Accept on the consent banner
    Then the analytics consent banner is not visible
    And the ph_consent cookie is "accepted"

  Scenario: Declining consent dismisses the banner and records the decision
    Given I have no analytics consent cookie
    When I visit the home page
    And I click Decline on the consent banner
    Then the analytics consent banner is not visible
    And the ph_consent cookie is "declined"

  Scenario: Visitor who previously declined sees no banner on a return visit
    Given the ph_consent cookie is already set to "declined"
    When I visit the home page
    Then the analytics consent banner is not visible
