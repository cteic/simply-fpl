Feature: Frank weekly cache handler

  The worker caches Frank's weekly AI advice in FRANK_WEEKLY_CACHE KV. On a
  cache hit the handler returns the stored JSON. On a cache miss it returns 404.
  The weekly cron calls Claude with the FPL bootstrap context and stores the
  result with a 7-day TTL.

  Scenario: Cache hit returns stored payload
    Given the FRANK_WEEKLY_CACHE contains a valid weekly payload for GW10
    When a GET request is made to /frank/weekly
    Then the response status is 200
    And the response body contains gameweek 10
    And the response header X-Cache is HIT

  Scenario: Cache miss returns 404
    Given the FRANK_WEEKLY_CACHE is empty
    When a GET request is made to /frank/weekly
    Then the response status is 404
    And the response header X-Cache is MISS

  Scenario: Weekly cron stores Claude response in KV
    Given a valid FPL bootstrap in FPL_CACHE for GW10
    And the Anthropic API returns a valid Frank payload
    When the Frank weekly cron runs
    Then the FRANK_WEEKLY_CACHE contains a weekly payload for GW10
    And the stored payload has captainCandidates and transferTargets
