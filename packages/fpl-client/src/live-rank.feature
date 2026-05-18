Feature: Live points calculation

  Scenario: Captain scores double in a standard squad
    Given an 11-player squad where each player scores 5 points and the captain scores 10
    When I calculate live points
    Then the total should be 70

  Scenario: Triple Captain chip triples the captain score
    Given an 11-player squad with the Triple Captain chip and a captain scoring 10
    When I calculate live points
    Then the total should be 80

  Scenario: Transfer hit is deducted from live points
    Given an 11-player squad scoring 50 gross points with a 4-point transfer hit
    When I calculate live points
    Then the net total should be 46

  Scenario: Bench Boost chip counts all 15 players
    Given 15 players each scoring 5 points with Bench Boost chip active
    When I calculate live points
    Then the total should be 75

  Scenario: Build live league table sorts by points descending
    Given three managers with live points of 60, 40, and 50
    When I build the live league table
    Then the managers should be ranked first, third, and second

  Scenario: Get current gameweek from bootstrap data
    Given bootstrap data with gameweek 1 marked as current
    When I get the current gameweek
    Then it should return 1

  Scenario: Get next gameweek from bootstrap data
    Given bootstrap data with gameweek 2 marked as next
    When I get the next gameweek
    Then it should return 2

  Scenario: Live rank estimate moves up when scoring above average
    Given my pre-gameweek rank is 100000 and the average score is 30
    When I score 50 live points
    Then the live rank estimate is 86000 with movement up 14000

  Scenario: Live rank estimate moves down when scoring below average
    Given my pre-gameweek rank is 100000 and the average score is 50
    When I score 30 live points
    Then the live rank estimate is 114000 with movement down 14000

  Scenario: Live rank estimate clamps to 1 at the top
    Given my pre-gameweek rank is 500 and the average score is 30
    When I score 100 live points
    Then the live rank estimate is 1 with movement up 49000
