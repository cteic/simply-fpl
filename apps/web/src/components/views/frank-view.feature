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

  Scenario: Ultimate user asks Frank and receives a response
    Given the Frank weekly cache returns GW10 advice
    And the user is on the ultimate tier with 0 queries this month
    And the FEATURE_FRANK_ONDEMAND flag is on
    When the user submits the question "Should I captain Salah this week?"
    Then they receive an advice response from Frank
    And the quota used updates to 1

  Scenario: Ultimate user at soft cap sees a warning
    Given the user is on the ultimate tier with 50 queries this month
    And the FEATURE_FRANK_ONDEMAND flag is on
    When the user views the Ask Frank form
    Then they see a soft cap warning indicating 50 of 80 questions used

  Scenario: Free user sees upgrade CTA linking to /upgrade
    Given the user is on the free tier
    And the FEATURE_FRANK_ONDEMAND flag is on
    When the user views the Ask Frank form
    Then they see a CTA that links to /upgrade

  Scenario: Free tier is served Frank from the weekly cache
    Given Frank access is resolved for the free tier
    Then Frank is served from the weekly-cache source
    And on-demand questions are not available

  Scenario: Pro tier is served Frank from the weekly cache
    Given Frank access is resolved for the pro tier
    Then Frank is served from the weekly-cache source
    And on-demand questions are not available

  Scenario: Ultimate tier asks Frank live
    Given Frank access is resolved for the ultimate tier
    Then Frank is served from the live source
    And on-demand questions are available

  Scenario: Gated free or pro user is shown an upgrade affordance to Ultimate
    Given Frank access is resolved for the free tier
    Then the upgrade affordance points to the ultimate tier
