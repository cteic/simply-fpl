Feature: Upgrade page checkout flow

  The upgrade page lets authenticated users choose a Pro or Ultimate plan and
  billing cycle, then redirects them to a Stripe Checkout session.

  Scenario: Free user clicking Pro Monthly is redirected to a Stripe Checkout URL
    Given the user is authenticated and on the free tier
    And the POST /api/stripe/checkout endpoint returns a Stripe Checkout URL
    When the user selects Pro Monthly and clicks Get Pro
    Then they are redirected to the Stripe Checkout URL

  Scenario: Free user clicking Ultimate Yearly is redirected to a Stripe Checkout URL
    Given the user is authenticated and on the free tier
    And the POST /api/stripe/checkout endpoint returns a Stripe Checkout URL
    When the user selects Ultimate Yearly and clicks Get Ultimate
    Then they are redirected to the Stripe Checkout URL

  Scenario: Ultimate user sees current plan indicator on the Ultimate card
    Given the user is authenticated and on the ultimate tier
    When the upgrade page is rendered
    Then the Ultimate card shows 'Current plan'
    And the Pro card shows 'Current plan'
