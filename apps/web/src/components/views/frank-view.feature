Feature: Frank AI coach view

  The Frank page shows weekly AI-generated FPL advice: captain picks, transfer
  targets, and an optional chip note. The "Ask Frank" form is hidden behind a
  feature flag and a tier gate — free/pro users see an upgrade prompt.

  Scenario: Free user sees weekly advice without Ask Frank form
    Given the Frank weekly cache returns GW10 advice
    And the user is on the free tier
    And the FEATURE_FRANK_ONDEMAND flag is off
    When the user visits the Frank page
    Then they see the captain picks section for GW10
    And they see the transfer targets section
    And the Ask Frank form is not visible

  Scenario: Pro user sees the same weekly advice as a free user
    Given the Frank weekly cache returns GW10 advice
    And the user is on the pro tier
    And the FEATURE_FRANK_ONDEMAND flag is off
    When the user visits the Frank page
    Then they see the captain picks section for GW10
    And the Ask Frank form is not visible

  Scenario: Frank advice not yet available shows empty state
    Given the Frank weekly cache returns a 404
    When the user visits the Frank page
    Then they see the empty state message
