Feature: Cohort aggregates hook

  The cohort aggregates hook fetches GW aggregate stats from the Worker endpoint
  /cohorts/gw{n}/aggregates.json and exposes the parsed tiers to the UI.

  Scenario: Returns parsed aggregates when the Worker responds with valid data
    Given the Worker returns valid cohort aggregates for gameweek 37
    When fetchCohortAggregates is called for gameweek 37
    Then the returned data contains avg_event_points for the top_10k tier

  Scenario: Returns null when the Worker responds with a 404
    Given the Worker returns 404 for the cohort aggregates endpoint
    When fetchCohortAggregates is called for gameweek 37
    Then the returned data is null

  Scenario: Returns null on a network error
    Given the Worker is unreachable
    When fetchCohortAggregates is called for gameweek 37
    Then the returned data is null
