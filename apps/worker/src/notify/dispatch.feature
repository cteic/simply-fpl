Feature: Notification dispatch UUID validation

  Scenario: Valid user_ids pass through to Supabase prefs query
    Given VAPID keys are configured
    When dispatchNotification is called with valid UUID user_ids
    Then the Supabase prefs URL includes the user_id=in.(...) filter

  Scenario: Non-UUID user_id is rejected before reaching Supabase
    Given VAPID keys are configured
    When dispatchNotification is called with user_ids containing "not-a-uuid"
    Then no Supabase request is made
    And the result is { sent: 0, failed: 0 }

  Scenario: SQL-injection-shaped user_id is rejected
    Given VAPID keys are configured
    When dispatchNotification is called with user_ids containing an injection string
    Then no Supabase request is made
    And the result is { sent: 0, failed: 0 }

  Scenario: No user_ids means all subscribed users are queried
    Given VAPID keys are configured
    When dispatchNotification is called without user_ids
    Then the Supabase prefs URL does not include user_id filter

  Scenario: Returns early when VAPID keys are missing
    Given VAPID keys are not configured
    When dispatchNotification is called without user_ids
    Then no Supabase request is made
    And the result is { sent: 0, failed: 0 }
