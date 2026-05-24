Feature: Slim /fpl/fixtures-slim endpoint

  The /fpl/fixtures-slim endpoint projects the cached fixtures blob down to the
  declared FplFixture shape, dropping the per-fixture stats array that balloons
  once matches are live. One slim blob backs both the all-fixtures request and
  event-scoped requests, which filter the cached array by gameweek.

  Scenario: Full fixtures KV hit recomputes a slim payload without the stats blob
    Given the raw fixtures blob is cached but the slim cache is empty
    When a client requests /fpl/fixtures-slim
    Then each slim fixture exposes exactly the declared FplFixture fields
    And the slim payload is written back to KV with a 10-minute TTL
    And the upstream FPL API is not called

  Scenario: Event filter returns only that gameweek
    Given the raw fixtures blob is cached but the slim cache is empty
    When a client requests /fpl/fixtures-slim for gameweek 2
    Then only fixtures for that gameweek are returned

  Scenario: KV miss falls back to upstream fetch
    Given no raw or slim fixtures are cached
    When a client requests /fpl/fixtures-slim
    Then the worker fetches fixtures from upstream
    And a slim fixtures payload is returned
