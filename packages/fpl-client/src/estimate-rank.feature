Feature: Percentile-based live-rank estimation

  Scenario: A score below the captured floor clamps to the bottom of the table
    Given the GW20 overall distribution
    And a total population of 13,000,000 managers
    When I estimate the rank for a score of 0
    Then the estimated rank is 13,000,000

  Scenario: A score at the cohort maximum clamps to rank 1
    Given the GW20 overall distribution
    And a total population of 13,000,000 managers
    When I estimate the rank for the cohort maximum score
    Then the estimated rank is 1

  Scenario: A score sitting exactly on a captured percentile maps to that percentile
    Given the GW20 overall distribution
    When I locate the percentile for a score of 44
    Then the percentile is 50

  Scenario: Scores between captured percentile bins use linear interpolation
    Given the GW20 overall distribution
    When I locate the percentile for a score of 50
    Then the percentile is between 50 and 75

  Scenario: A score above the 99th percentile extrapolates into the histogram tail
    Given the GW20 overall distribution
    When I locate the percentile for a score that is one short of the max
    Then the percentile is above 99 and at most 100

  Scenario: Realistic GW20 score maps to a sensible overall rank
    Given the GW20 overall distribution
    And a total population of 13,000,000 managers
    When I estimate the rank for a score of 65
    Then the estimated rank sits between rank 750,000 and rank 2,000,000

  Scenario: GW38 above-average score departs meaningfully from the flat-700 baseline
    Given the GW38 overall distribution
    And a total population of 13,100,000 managers
    And a pre-gameweek overall rank of 100,000
    And a GW score of 70 against a GW average of 45
    When I estimate the live rank under the new percentile model
    And I estimate the live rank under the old flat-700 heuristic
    Then the two estimates differ by at least 200,000 ranks

  Scenario: Every captured gameweek is loadable for both the overall and top_10k cohorts
    When I load every captured gameweek's overall and top_10k distribution
    Then no load throws and every distribution carries a non-empty histogram
