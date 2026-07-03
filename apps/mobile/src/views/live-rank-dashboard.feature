Feature: Live rank dashboard — mobile view

  Scenario: Entry snapshot endpoint is called for the given team ID
    Given a team ID of 12345
    When the dashboard requests entry data
    Then fetch is called with the snapshot URL for entry 12345

  Scenario: Dashboard shows error state when snapshot endpoint returns 500
    Given the snapshot endpoint returns a 500 error
    When the dashboard requests entry data for team 12345
    Then an error is thrown with status code in the message

  Scenario: Formation is derived from starting XI positions
    Given a squad with 4 defenders, 4 midfielders and 2 forwards
    When the formation is derived
    Then the formation string is 4-4-2

  Scenario: Provisional bonus marker appears when bonus is non-zero
    Given live data has a player with 3 provisional bonus points
    When bonus points are predicted for an unfinished fixture
    Then the player's bonus map entry is provisional and equals 3
