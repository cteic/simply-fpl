Feature: League position

  A manager's standing in a mini-league in the terms a rival would use: who is
  directly above and below, by how much, and how this gameweek went against
  the rest of the league.

  Scenario: The gaps to the managers above and below are reported
    Given a real eleven-manager league with the manager in tenth
    When I describe their position
    Then they are tenth of eleven
    And the manager above is named with the points needed to draw level
    And the manager below is named with the cushion over them
    And the gap to the leader is reported

  Scenario: This gameweek is ranked within the league
    Given a real eleven-manager league with the manager in tenth
    When I describe their position
    Then their gameweek score places them among the league's worst this week

  Scenario: The leader has nobody above
    Given a real eleven-manager league
    When I describe the leader's position
    Then nobody is above them and the gap to the leader is zero

  Scenario: A manager not on the page is not guessed at
    Given a real eleven-manager league
    When I describe the position of a manager who is not in it
    Then no position is returned

  Scenario: A league with further pages does not claim a size or a gameweek place
    Given the first page of a league that has more pages
    When I describe their position from that page alone
    Then the rank and the gaps to neighbours are reported
    And the league size and the gameweek place are left unknown

  Scenario: A finished gameweek is settled even though it is still current
    Given a bootstrap whose current gameweek has finished
    When I ask for the gameweek phase
    Then it is settled

  Scenario: A gameweek past its deadline and unfinished is live
    Given a bootstrap whose current gameweek is unfinished
    When I ask for the gameweek phase after the deadline
    Then it is live
    And before the deadline it is pre

  Scenario: Planning starts at the gameweek that can still be changed
    Given a bootstrap where gameweek 11 is current and gameweek 12 is next
    When I ask for the planning gameweek
    Then it is 12
    And at the end of the season it falls back to the current gameweek

