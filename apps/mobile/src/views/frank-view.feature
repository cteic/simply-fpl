Feature: Frank view — mobile

  Scenario: Free-tier user cannot access weekly advice
    Given a user on the "free" tier
    When Frank access is resolved
    Then on-demand questions are not available
    And the upgrade tier is "ultimate"

  Scenario: Pro-tier user receives weekly-cache advice
    Given a user on the "pro" tier
    When Frank access is resolved
    Then on-demand questions are not available
    And the weekly source is "weekly-cache"

  Scenario: Ultimate-tier user gets on-demand access
    Given a user on the "ultimate" tier
    When Frank access is resolved
    Then on-demand questions are available

  Scenario: Weekly payload shape is validated
    Given a valid frank weekly payload
    When the payload is validated
    Then it is accepted as a FrankWeeklyPayload

  Scenario: Invalid shape is rejected
    Given an object missing required frank fields
    When the payload is validated
    Then it is rejected
