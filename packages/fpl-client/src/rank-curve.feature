Feature: Points-to-rank curve

  FPL publishes no live rank, so we estimate it. The global classic league
  (id 314) pages the whole field 50 entries at a time with exact ranks against
  exact total points, so sampling it gives FPL's own points-to-rank mapping
  rather than a model of it.

  Scenario: A curve needs enough samples to interpolate between
    Given only three sampled pages
    When I build a curve from them
    Then the curve is rejected

  Scenario: The curve maps a total to a rank
    Given the sampled GW11 global league pages
    When I build a curve from them
    Then looking up a sampled total returns that sample's rank
    And looking up a total between two samples interpolates between their ranks
    And a total above the best sample clamps to rank 1
    And a total below the worst sample clamps to the field size

  Scenario: The curve inverts to answer what a rank is worth
    Given the sampled GW11 global league pages
    When I build a curve from them
    Then asking what rank 49929 is worth returns that sample's total
    And a round trip from total to rank and back lands on the same total

  Scenario: The curve beats the flat heuristic on held-out pages
    Given the sampled GW11 global league pages
    And twenty held-out pages the sampler never saw
    When I build a curve from them
    Then the median absolute rank error stays at or below the measured ratchet
    And the curve reproduces a known entry's published overall rank

  Scenario: A live estimate shifts the field by what it has scored
    Given the sampled GW11 global league pages
    When I build a curve from them
    And a manager on 581 points before the gameweek scores 25 while the field averages 35
    Then the estimate comes from the official curve
    And the estimate is worse than their pre-gameweek rank

  Scenario: Ranks shorten for a label only when they are round
    Given no curve is needed
    When I shorten some ranks
    Then 10000 reads as 10k and 1000000 as 1M
    And an arbitrary rank keeps all its digits
