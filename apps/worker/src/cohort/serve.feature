Feature: Serve cohort aggregates over HTTP

  Bridges the cohort engine's KV snapshots to the web client. The client's
  availability gate does a HEAD on /cohorts/gw{N}/aggregates.json and the
  surfaces (threats, effective-ownership, cohort table) GET the combined
  per-tier payload.

  Scenario: GET returns the combined per-tier payload when snapshots exist
    Given KV holds cohort snapshots for gw 37 tiers "top_10k" and "overall"
    When I GET "/cohorts/gw37/aggregates.json"
    Then the response status is 200
    And the JSON body has tiers "top_10k" and "overall"

  Scenario: GET returns 404 when no snapshots exist for the gameweek
    Given KV holds no cohort snapshots for gw 99
    When I GET "/cohorts/gw99/aggregates.json"
    Then the response status is 404

  Scenario: HEAD returns 200 when at least one tier snapshot exists
    Given KV holds cohort snapshots for gw 37 tiers "top_10k"
    When I HEAD "/cohorts/gw37/aggregates.json"
    Then the response status is 200

  Scenario: HEAD returns 404 when no snapshot exists
    Given KV holds no cohort snapshots for gw 99
    When I HEAD "/cohorts/gw99/aggregates.json"
    Then the response status is 404
