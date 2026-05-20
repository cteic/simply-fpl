Feature: Head-to-head comparison

  Scenario: Score delta is positive when user outscores opponent
    Given two managers where my squad scores 60 points and theirs scores 40 points
    When I compute the H2H result
    Then my score delta should be 20

  Scenario: Common picks are identified when both managers share a player
    Given two managers who both have player 1 in their starting XI
    When I compute the H2H result
    Then player 1 should appear in the common picks list

  Scenario: Differential players are identified correctly
    Given my squad contains player 99 and the opponent does not
    When I compute the H2H result
    Then player 99 should appear in my differential picks

  Scenario: Transfer cost is deducted from net GW points
    Given my squad scores 50 points with a 4-point transfer hit
    When I compute the H2H result
    Then my net GW points should be 46

  Scenario: Players carry their real team code for kit rendering
    Given two managers whose squads are all Arsenal players
    When I compute the H2H result
    Then every player on both sides should carry Arsenal's team code
