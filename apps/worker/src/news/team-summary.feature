Feature: AI team injury summary generation

  For clubs with 3 or more flagged players the worker generates a 2-sentence
  summary via Anthropic and caches it in KV. The cache key is fingerprinted by
  the set of flagged player IDs so a different squad state triggers a new call.

  Scenario: Teams with fewer than 3 flagged players receive no summary
    Given a team group with 2 flagged players
    When generateTeamSummaries is called
    Then the group summary is not set
    And the Anthropic API is not called

  Scenario: Teams with 3 or more flagged players receive a summary on cache miss
    Given a team group with 3 flagged players
    And the Anthropic API returns "Arsenal face a tough week. Saka, Havertz and White are all doubtful."
    When generateTeamSummaries is called
    Then the group summary matches the Anthropic response
    And the summary is stored in KV with the 48-hour TTL

  Scenario: Cached summary is served without a new Anthropic call
    Given a team group with 3 flagged players
    And a cached summary exists in KV for those players
    When generateTeamSummaries is called
    Then the cached summary is returned
    And the Anthropic API is not called

  Scenario: Daily spend cap prevents further Anthropic calls when exhausted
    Given a team group with 3 flagged players
    And the daily spend counter is already at the cap
    When generateTeamSummaries is called
    Then no summary is generated
    And the Anthropic API is not called

  Scenario: A different set of flagged players produces a cache miss
    Given a team group with 3 flagged players cached under one fingerprint
    And the team now has 4 flagged players (a new player added)
    And the Anthropic API returns a new summary
    When generateTeamSummaries is called
    Then the new summary is returned
    And the Anthropic API is called once
