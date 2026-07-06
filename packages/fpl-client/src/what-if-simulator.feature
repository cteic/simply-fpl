Feature: What-If Simulator

  Scenario: Transferring in Haaland as captain to replace captain Salah increases total by 16 points
    Given a live gameweek where Salah is captain scoring 4 points and the rest of the XI each score 2
    And Haaland is available in bootstrap scoring 12 points live
    When I simulate a transfer swap from Salah to Haaland
    Then the simulated total increases by 16 points
    And the estimated rank improves

  Scenario: Swapping captain from Salah to Haaland when both are in the XI increases total by 8 points
    Given a live gameweek where Salah is captain scoring 4 points and Haaland is also in the XI scoring 12 points and the remaining 9 each score 2
    When I simulate a captain swap from Salah to Haaland
    Then the simulated total increases by 8 points
    And the estimated rank improves

  Scenario: Captain not in starting XI returns no result
    Given a live gameweek where the captain is on the bench at position 12
    When I simulate a captain swap targeting that bench player
    Then the simulation result is null

  Scenario: Swapping a bench player out via transfer returns no result
    Given a live gameweek with a normal starting XI
    When I simulate a transfer of a player at bench position 12
    Then the simulation result is null

  Scenario: Swapping a player with themselves returns no result
    Given a live gameweek with a normal starting XI and Salah as captain
    When I simulate a captain swap from Salah to Salah
    Then the simulation result is null

  Scenario: Triple Captain chip uses 3x multiplier for the new captain
    Given a live gameweek with Triple Captain chip active where Salah is captain scoring 6 points and Haaland is in the XI scoring 12 points and the remaining 9 each score 2
    When I simulate a captain swap from Salah to Haaland
    Then the simulated total increases by 12 points

  Scenario: Gameweek not yet started produces zero delta
    Given a live gameweek where no player has scored any points yet and Salah is captain
    When I simulate a captain swap from Salah to a different XI player who also has 0 points
    Then the delta points is 0
