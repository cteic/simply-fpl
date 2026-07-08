Feature: Player availability change notifications

  The worker dispatches a push notification on each warm tick where a player's
  status or news changes, targeting Pro/Ultimate users who have that player in
  their squad and the player_availability_changed preference enabled.

  Scenario: First run writes snapshot and sends no notifications
    Given no previous snapshot exists in KV
    And the bootstrap has one doubtful player
    When runPlayerAvailabilityCheck is called
    Then the snapshot is written to KV
    And no push is sent

  Scenario: Player newly flagged triggers notification for users with that player
    Given a snapshot where player 10 was available
    And the bootstrap now shows player 10 as doubtful with news "Knock"
    And user A has player 10 in their squad and player_availability_changed enabled
    When runPlayerAvailabilityCheck is called
    Then a push is sent to user A
    And the notification title contains the player name

  Scenario: Ruled out player triggers notification
    Given a snapshot where player 20 was doubtful
    And the bootstrap now shows player 20 as injured (status i, 0% chance)
    And user A has player 20 in their squad and player_availability_changed enabled
    When runPlayerAvailabilityCheck is called
    Then a push is sent to user A
    And the notification title contains "ruled out"

  Scenario: User without the changed player in squad receives no notification
    Given a snapshot where player 10 was available
    And the bootstrap now shows player 10 as doubtful
    And user B does not have player 10 in their squad
    When runPlayerAvailabilityCheck is called
    Then no push is sent to user B

  Scenario: Quiet hours suppress availability notifications
    Given a snapshot where player 10 was available
    And the bootstrap now shows player 10 as doubtful
    And user A has player 10 in their squad and player_availability_changed enabled
    And user A has quiet hours covering the current UTC hour
    When runPlayerAvailabilityCheck is called
    Then no push is sent

  Scenario: No changes between ticks produces no notifications
    Given a snapshot where player 10 was doubtful at 50% chance
    And the bootstrap still shows player 10 as doubtful at 50% chance
    And user A has player 10 in their squad and player_availability_changed enabled
    When runPlayerAvailabilityCheck is called
    Then no push is sent

  Scenario: Upgraded chance of playing triggers notification
    Given a snapshot where player 30 was doubtful at 25% chance
    And the bootstrap now shows player 30 still doubtful but at 75% chance
    And user A has player 30 in their squad and player_availability_changed enabled
    When runPlayerAvailabilityCheck is called
    Then a push is sent to user A
    And the notification title contains "could feature"
