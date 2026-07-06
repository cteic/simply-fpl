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

  Scenario: customer.subscription.updated with status canceled reverts the user to the free tier
    Given a customer.subscription.updated event with status canceled
    When the webhook handler processes the event
    Then the user's profile tier becomes 'free'

  Scenario: customer.subscription.updated with status active applies the price tier
    Given a customer.subscription.updated event with status active for Pro Monthly
    When the webhook handler processes the event
    Then the user's profile tier becomes 'pro'

  Scenario: duplicate event returns 200 without re-running handlers
    Given the stripe_events table already contains the event ID
    When the webhook handler processes the same event again
    Then the response status is 200
    And the profiles table is not updated

  Scenario: handler DB write failure returns 5xx so Stripe retries
    Given a valid Stripe checkout.session.completed event for Pro Monthly
    And the profiles update will fail with a DB error
    When the webhook handler processes the event
    Then the response status is 500
    And no idempotency record is written for the event

  Scenario: transient DB error on the idempotency claim returns 500 without running handlers
    Given a valid Stripe checkout.session.completed event for Pro Monthly
    And the stripe_events insert will fail with a transient error
    When the webhook handler processes the event
    Then the response status is 500
    And the profiles table is not updated

  Scenario: charge.refunded with a full refund reverts the user to the free tier
    Given an existing Pro subscriber with a fully refunded charge
    When the webhook receives charge.refunded
    Then the user's profile tier becomes 'free'

  Scenario: charge.refunded with a partial refund does not revert the user's tier
    Given an existing Pro subscriber with a partially refunded charge
    When the webhook receives charge.refunded
    Then the profiles table is not updated

  Scenario: charge.dispute.created reverts the user to the free tier
    Given an existing Pro subscriber with a dispute on their charge
    When the webhook receives charge.dispute.created
    Then the user's profile tier becomes 'free'
