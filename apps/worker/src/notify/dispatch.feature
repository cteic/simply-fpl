Feature: Notification dispatch

  Scenario: Dispatches deadline reminder to subscribed Pro users
    Given VAPID keys are configured
    And 2 users have deadline_reminder enabled in notification_prefs
    And both users have a web push subscription
    When dispatchNotification is called with event deadline_reminder
    Then web-push sendNotification is called twice
    And 2 notification_log rows are inserted
    And the result is { sent: 2, failed: 0 }

  Scenario: Skips users without the event pref enabled
    Given VAPID keys are configured
    And 1 user has deadline_reminder disabled in notification_prefs
    When dispatchNotification is called with event deadline_reminder
    Then web-push sendNotification is not called
    And the result is { sent: 0, failed: 0 }

  Scenario: Deletes 410-gone subscriptions
    Given VAPID keys are configured
    And 1 user has deadline_reminder enabled
    And that user has a stale push subscription
    When the push service responds 410 Gone for that subscription
    Then the subscription row is deleted from Supabase
    And the result is { sent: 0, failed: 1 }

  Scenario: Returns early when VAPID keys are missing
    Given VAPID keys are not set
    When dispatchNotification is called with event deadline_reminder
    Then web-push sendNotification is not called
    And the result is { sent: 0, failed: 0 }

  Scenario: Scopes dispatch to provided user_ids
    Given VAPID keys are configured
    And 3 users have deadline_reminder enabled
    And all 3 have push subscriptions
    When dispatchNotification is called with event deadline_reminder and userIds for 1 of them
    Then web-push sendNotification is called once
    And the result is { sent: 1, failed: 0 }
