Feature: League rank-change alerts

  Scenario: User enters top N for the first time
    Given a user has a league alert sub with top_n of 3 for league 1234
    And their current rank in league 1234 is 2 (inside top 3)
    And no previous rank is stored (first evaluation)
    When runLeagueRankAlertCheck is called
    Then a push is sent notifying the user they entered top 3

  Scenario: User falls out of top N
    Given a user has a league alert sub with top_n of 3 for league 1234
    And their current rank in league 1234 is 4 (outside top 3)
    And the previously stored rank was 2 (inside top 3)
    When runLeagueRankAlertCheck is called
    Then a push is sent notifying the user they left top 3

  Scenario: Rank change meets swing_n threshold
    Given a user has a league alert sub with swing_n of 5 for league 1234
    And their current rank in league 1234 is 10
    And the previously stored rank was 3
    When runLeagueRankAlertCheck is called
    Then a push is sent notifying the user of a rank change of 7 places

  Scenario: Rank change below swing_n threshold does not trigger
    Given a user has a league alert sub with swing_n of 5 for league 1234
    And their current rank in league 1234 is 10
    And the previously stored rank was 9
    When runLeagueRankAlertCheck is called
    Then no push is sent for that user

  Scenario: Stored rank is updated after evaluation
    Given a user has a league alert sub with top_n of 3 for league 1234
    And their current rank is 5 (outside top 3)
    And the previously stored rank was 6 (also outside top 3)
    When runLeagueRankAlertCheck is called
    Then no push is sent
    And the stored rank is updated to 5

  Scenario: User not in league standings page 1 is skipped gracefully
    Given a user has a league alert sub for league 1234
    And their fpl_entry_id does not appear in the first page of standings
    When runLeagueRankAlertCheck is called
    Then no push is sent for that user
