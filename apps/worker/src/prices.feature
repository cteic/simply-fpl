Feature: Slim /fpl/prices endpoint

  The /fpl/prices endpoint computes price-change predictions on the worker
  using the cached bootstrap-static blob, returning a slim payload (~5KB)
  instead of shipping the full 200KB bootstrap to the client.

  Scenario: Slim cache hit returns cached payload without recomputing
    Given the slim prices cache is warm
    When a client requests /fpl/prices
    Then the worker returns the cached slim payload
    And the upstream FPL API is not called

  Scenario: KV bootstrap hit recomputes slim payload
    Given the bootstrap-static blob is cached but the slim prices cache is empty
    When a client requests /fpl/prices
    Then the worker computes a fresh slim payload from the cached bootstrap
    And the slim payload is written back to KV with a 10-minute TTL
    And the upstream FPL API is not called

  Scenario: KV miss falls back to upstream fetch
    Given no bootstrap or slim payload is cached
    When a client requests /fpl/prices
    Then the worker fetches bootstrap-static from upstream
    And the worker computes a slim payload from the upstream response

  Scenario: Malformed bootstrap in KV is recovered from upstream
    Given the bootstrap-static cache contains malformed JSON
    When a client requests /fpl/prices
    Then the worker fetches bootstrap-static from upstream
    And the worker returns a valid slim payload

  Scenario: scheduled() warms bootstrap, fixtures, and slim prices in KV
    Given the FPL upstream is healthy
    When the cron scheduler triggers warmPricesCache
    Then the bootstrap-static blob is written to KV with a 1-hour TTL
    And the fixtures blob is written to KV with a 10-minute TTL
    And the slim prices payload is written to KV with a 10-minute TTL
