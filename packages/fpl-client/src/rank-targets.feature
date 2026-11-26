Feature: Rank targets

  FPL publishes no live rank, let alone what a manager needs to score to reach
  a given one. The points-to-rank curve inverts, so the target falls out of the
  same data the live estimate reads.

  Scenario: A target round-trips back to the rank it was asked for
    Given the GW11 curve and a manager on 606 points before the gameweek
    When I compute their rank targets
    Then feeding each target's total back through the curve returns its rank

  Scenario: Holding position means matching the field
    Given the GW11 curve and a manager on 606 points before the gameweek
    When I compute their rank targets
    Then the points needed to hold rank match the field average

  Scenario: The next target is the nearest milestone still ahead
    Given the GW11 curve and a manager on 606 points before the gameweek
    When I compute their rank targets
    Then the next target is the best milestone better than their live rank
    And every milestone worse than their live rank is already achieved

  Scenario: A manager near the top has a harder next target
    Given the GW11 curve and a manager on 793 points before the gameweek
    When I compute their rank targets
    Then the 10k milestone is already achieved
    And reaching 1k still costs points

  Scenario: Targets beyond the field are dropped
    Given the GW11 curve and a manager on 606 points before the gameweek
    When I ask for a target rank past the end of the field
    Then that target is not returned

  Scenario: Inputs that cannot place the manager return nothing
    Given the GW11 curve and a manager on 606 points before the gameweek
    When the pre-gameweek total is missing
    Then no targets are returned
    And an empty curve also returns nothing

  Scenario: A curve from the wrong gameweek is refused, not estimated
    Given the GW11 curve and a manager on 606 points before the gameweek
    When the live gameweek is not the one after the curve
    Then no targets are returned
