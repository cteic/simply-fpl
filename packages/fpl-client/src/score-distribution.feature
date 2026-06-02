Feature: Cohort score distribution

  Scenario: Percentiles and summary stats over an evenly spaced sample
    Given a score sample of 10, 20, 30, 40 and 50
    When I compute the score distribution
    Then the sample size is 5 with min 10, max 50 and mean 30
    And the median is 30 with p25 20 and p75 40

  Scenario: Histogram buckets scores into fixed-width bins
    Given a score sample of 50, 52, 54, 55, 60 and 61 with bin size 5
    When I compute the score distribution
    Then the histogram spans bins from 50 to 65
    And the bin starting at 50 holds 3 scores and the bin starting at 60 holds 2 scores

  Scenario: A single-manager sample collapses to one value
    Given a score sample of 42
    When I compute the score distribution
    Then every percentile equals 42 and the sample size is 1

  Scenario: An empty sample cannot produce a distribution
    Given an empty score sample
    When I compute the score distribution expecting failure
    Then it throws an error
