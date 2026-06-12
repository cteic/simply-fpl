Feature: Stripe webhook handler

  The webhook handler verifies the Stripe signature, records the event ID for
  idempotency, and updates the profiles table accordingly.

  Scenario: checkout.session.completed for a Pro Monthly purchase sets profile tier to pro
    Given a valid Stripe checkout.session.completed event for Pro Monthly
    When the webhook handler processes the event
    Then the user's profile tier becomes 'pro'
    And the stripe_customer_id is stored on the profile
    And the stripe_subscription_id is stored on the profile

  Scenario: checkout.session.completed for a Pro Lifetime purchase sets profile tier to pro
    Given a valid Stripe checkout.session.completed event for Pro Lifetime (payment mode)
    When the webhook handler processes the event
    Then the user's profile tier becomes 'pro'
    And the stripe_subscription_id is null on the profile

  Scenario: customer.subscription.deleted reverts the user to the free tier
    Given an existing Pro subscriber
    When the webhook receives customer.subscription.deleted
    Then the user's profile tier becomes 'free'

  Scenario: duplicate event ID is silently ignored
    Given the stripe_events table already contains the event ID
    When the webhook handler processes the same event again
    Then the profile tier is not updated a second time
