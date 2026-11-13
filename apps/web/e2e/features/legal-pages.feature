Feature: Legal and support pages

  The App Store, Play Store and Stripe each need a live privacy-policy URL.
  The footer on every page links to the privacy policy, the terms and the
  support page, and each page renders its own heading.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And no team is saved in storage

  Scenario: The footer links to privacy, terms and support
    When I visit the home page
    Then no page error should have occurred
    And the footer links "Privacy" to "/privacy"
    And the footer links "Terms" to "/terms"
    And the footer links "Support" to "/support"

  Scenario: Following the footer link opens the privacy policy
    Given the ph_consent cookie is already set to "declined"
    When I visit the home page
    And I follow the footer link "Privacy"
    Then no page error should have occurred
    And the page heading reads "Privacy Policy"

  Scenario Outline: Each legal page renders its heading when opened directly
    When I open the legal page "<path>"
    Then no page error should have occurred
    And the page heading reads "<heading>"

    Examples:
      | path     | heading          |
      | /privacy | Privacy Policy   |
      | /terms   | Terms of Service |
      | /support | Support          |
