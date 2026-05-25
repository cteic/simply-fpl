Feature: Offline rank-accuracy replay harness

  The harness replays the committed season archive against the shipping
  estimateLiveRank model and reports how wrong the flat-700 heuristic is,
  overall and per true-rank band. It is the offline gate every future model
  must beat — no live data, no network.

  Scenario: A finished gameweek becomes a scorable sample
    Given an archived entry with end-of-GW overall ranks 2000000 then 1500000
    And the bootstrap average for GW2 is 50
    When I build the replay samples for that entry
    Then there is one sample for GW2
    And its pre-GW rank is 2000000
    And its true rank is 1500000

  Scenario: GW1 cannot be scored because it has no prior rank
    Given an archived entry with end-of-GW overall ranks 2000000 then 1500000
    And the bootstrap average for GW2 is 50
    When I build the replay samples for that entry
    Then no sample is built for GW1

  Scenario: Net points subtract the transfer hit, gross points do not
    Given a replay sample with gross points 92 and a transfer cost of 4
    Then the gross points are 92
    And the net points are 88

  Scenario: An above-average score is predicted to climb the table
    Given a replay sample with pre-GW rank 1000000 scoring 80 against an average of 50
    When I score the sample in gross mode
    Then the predicted rank is higher up the table than the pre-GW rank

  Scenario: The flat-700 baseline error stays at or below the recorded ceiling
    Given the committed season archive
    When I replay it against the shipping estimator in net mode
    Then the overall median absolute percent error is at or below the recorded baseline
    And the top-100k median absolute percent error is at or below the recorded baseline
    And the top-100k signed bias is negative
