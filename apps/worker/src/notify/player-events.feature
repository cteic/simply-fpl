Feature: Player event notifications

  Scenario: Captain scores a goal and triggers a bundled push
    Given a live tick where the captain scored 1 new goal this tick
    And the user has goal_scored enabled in notification_prefs
    And quiet hours are not active
    When runPlayerEventsCheck is called
    Then a push is sent for that user
    And the notification mentions the player's name and captain context

  Scenario: Multiple events for different squad players are batched into one push
    Given a live tick where player A scored a goal and player B got an assist
    And the user has both goal_scored and assist enabled
    And quiet hours are not active
    When runPlayerEventsCheck is called
    Then exactly one push is sent for that user
    And the notification body mentions both players

  Scenario: Already-notified goals are not re-sent
    Given stored stats show the player already had 1 goal
    And the live tick still shows 1 goal (no new goals this tick)
    When runPlayerEventsCheck is called
    Then no push is sent for that user

  Scenario: Red card triggers a push regardless of points
    Given a live tick where a squad player received a new red card
    And the user has red_card enabled in notification_prefs
    And quiet hours are not active
    When runPlayerEventsCheck is called
    Then a push is sent for that user

  Scenario: Quiet hours suppress player event notifications
    Given a live tick where a squad player scored a new goal
    And the user has goal_scored enabled
    And quiet hours are active (current UTC hour is within the range)
    When runPlayerEventsCheck is called
    Then no push is sent for that user

  Scenario: User with goal_scored disabled does not receive goal notifications
    Given a live tick where a squad player scored a new goal
    And the user has goal_scored disabled in notification_prefs
    When runPlayerEventsCheck is called
    Then no push is sent for that user

  Scenario: First tick with no previous stats does not trigger notifications
    Given no stored stats exist for the current gameweek
    And the live tick shows a player with 2 goals
    When runPlayerEventsCheck is called
    Then no push is sent (first-tick baseline established)
