Feature: Live points calculation

  Scenario: Captain scores double in a standard squad
    Given an 11-player squad where each player scores 5 points and the captain scores 10
    When I calculate live points
    Then the total should be 70

  Scenario: Triple Captain chip triples the captain score
    Given an 11-player squad with the Triple Captain chip and a captain scoring 10
    When I calculate live points
    Then the total should be 80

  Scenario: Triple Captain multiplier is read from pick.multiplier not the chip flag
    Given an 11-player squad with no active chip where the captain pick carries multiplier 3
    When I calculate live points
    Then the captain's points are tripled and the total is 80

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

  Scenario: Get the next gameweek deadline from bootstrap data
    Given bootstrap data with gameweek 2 as next and deadline "2025-08-22T17:30:00Z"
    When I get the next deadline
    Then it should return event 2 with deadline "2025-08-22T17:30:00Z"

  Scenario: No next deadline at the end of the season
    Given bootstrap data with no next gameweek
    When I get the next deadline
    Then it should return nothing

  Scenario: Format days and hours remaining
    Given 2 days 4 hours and 30 minutes remain
    When I format the time remaining
    Then it should read "2d 4h"

  Scenario: Format hours and minutes remaining
    Given 4 hours 32 minutes and 10 seconds remain
    When I format the time remaining
    Then it should read "4h 32m"

  Scenario: Format minutes and seconds remaining
    Given 12 minutes and 30 seconds remain
    When I format the time remaining
    Then it should read "12m 30s"

  Scenario: A passed deadline reads as closed
    Given the deadline has already passed
    When I format the time remaining
    Then it should read "closed"

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

  Scenario: Rank details derive pre-subs and post-subs ranks with change percent
    Given my pre-gameweek rank is 100000 and the average score is 30
    When I compute rank details with 50 live points and 58 post-subs points
    Then the old rank is 100000, pre-subs rank 86000, post-subs rank 80400 and change 19.6 percent

  Scenario: Rank details are unavailable without a pre-gameweek rank
    Given my pre-gameweek rank is 0 and the average score is 30
    When I compute rank details with 50 live points and 58 post-subs points
    Then there are no rank details

  Scenario: Season-mismatch bootstrap triggers live-cohort aggregate over captured distribution
    Given a captured GW1 distribution from season 2025
    And a live cohort score distribution with mean 60 for season 2026
    And a bootstrap showing GW1 deadline in August 2026
    When I call estimateLiveRankSmart with gw 1 and the live aggregate
    Then the estimate source is "live-cohort"

  Scenario: Same-season bootstrap uses the captured distribution
    Given a captured GW1 distribution from season 2025
    And a bootstrap showing GW1 deadline in August 2025
    When I call estimateLiveRankSmart with gw 1 and no live aggregate
    Then the estimate source is "captured-same-season"

  Scenario: Season-mismatch without live aggregate falls to prior-season-scaled
    Given a captured GW1 distribution from season 2025
    And a bootstrap showing GW1 deadline in August 2026
    When I call estimateLiveRankSmart with gw 1 and no live aggregate
    Then the estimate source is "captured-prior-season-scaled"

  Scenario: No captured distribution and no live aggregate falls to flat heuristic
    Given no captured distribution exists for gw 999
    When I call estimateLiveRankSmart for gw 999 with no live aggregate
    Then the estimate source is "flat-heuristic"
