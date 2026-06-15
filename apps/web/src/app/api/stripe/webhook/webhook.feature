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

  Scenario: duplicate event returns 200 after handlers re-run idempotently
    Given the stripe_events table already contains the event ID
    When the webhook handler processes the same event again
    Then the response status is 200

  Scenario: handler DB write failure returns 5xx so Stripe retries
    Given a valid Stripe checkout.session.completed event for Pro Monthly
    And the profiles update will fail with a DB error
    When the webhook handler processes the event
    Then the response status is 500
    And no idempotency record is written for the event

  Scenario: non-duplicate DB error on idempotency insert returns 5xx
    Given a valid Stripe checkout.session.completed event for Pro Monthly
    And the stripe_events insert will fail with a transient error
    When the webhook handler processes the event
    Then the response status is 500

  Scenario: charge.refunded reverts the user to the free tier
    Given an existing Pro subscriber with a refunded charge
    When the webhook receives charge.refunded
    Then the user's profile tier becomes 'free'

  Scenario: charge.dispute.created reverts the user to the free tier
    Given an existing Pro subscriber with a dispute on their charge
    When the webhook receives charge.dispute.created
    Then the user's profile tier becomes 'free'
