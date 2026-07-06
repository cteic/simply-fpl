Feature: Notification opt-in

  Scenario: User enables notifications for the first time
    Given the browser supports push notifications
    And the user is authenticated as a Pro user
    And notification permission is 'default'
    And no existing push subscription exists
    When the user clicks "Enable notifications"
    And the browser prompts for permission and the user accepts
    Then the service worker subscribes to push
    And a POST to /api/notifications/subscribe is made with endpoint, p256dh, and auth
    And isSubscribed becomes true

  Scenario: User disables notifications
    Given the browser supports push notifications
    And the user is authenticated as a Pro user
    And notification permission is 'granted'
    And a push subscription already exists
    When the user clicks "Disable notifications"
    Then pushManager.unsubscribe is called
    And a DELETE to /api/notifications/subscribe is made with the endpoint
    And isSubscribed becomes false

  Scenario: Browser denies permission
    Given the browser supports push notifications
    And the user is authenticated as a Pro user
    And notification permission is 'default'
    When the user clicks "Enable notifications"
    And the browser prompts for permission and the user denies
    Then isSubscribed remains false
    And permission becomes 'denied'

  Scenario: Browser does not support push
    Given the browser does not support PushManager
    And the user is authenticated as a Pro user
    Then permission is 'unsupported'
    And the subscribe action is a no-op

  Scenario: User toggles deadline reminder preference off
    Given the browser supports push notifications
    And the user is authenticated as a Pro user
    And isSubscribed is true
    And deadlineReminder pref is enabled
    When the user toggles deadlineReminder off
    Then a PUT to /api/notifications/prefs is made with deadline_reminder false
    And the local prefs state reflects the change immediately
