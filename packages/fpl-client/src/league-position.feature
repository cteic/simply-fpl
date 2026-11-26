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

  Scenario: A finished gameweek is settled even though it is still current
    Given a bootstrap whose current gameweek has finished
    When I ask for the gameweek phase
    Then it is settled

  Scenario: A gameweek past its deadline and unfinished is live
    Given a bootstrap whose current gameweek is unfinished
    When I ask for the gameweek phase after the deadline
    Then it is live
    And before the deadline it is pre
