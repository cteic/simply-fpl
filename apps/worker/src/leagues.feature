Feature: Slim /fpl/leagues/:id/summary endpoint

  The /fpl/leagues/:id/summary endpoint fetches the classic-league standings and
  projects them down to the declared FplLeague shape, dropping the new_entries
  block, last_updated_data and league metadata the league and rivals views never
  read. Results are KV-cached for 90 seconds.

  Scenario: Cache hit returns cached summary without refetching
    Given the league summary cache is warm
    When a client requests /fpl/leagues/314/summary
    Then the worker returns the cached summary
    And the upstream FPL API is not called

  Scenario: Upstream fetch projects to the slim league shape
    Given no league summary is cached
    When a client requests /fpl/leagues/314/summary
    Then the worker fetches the classic-league standings from upstream
    And the slim summary keeps the standings but drops new_entries and metadata
    And the slim summary is written to KV with a 90-second TTL

  Scenario: Upstream error is surfaced to the client
    Given the upstream returns a 404
    When a client requests /fpl/leagues/999/summary
    Then the worker returns the upstream error status
