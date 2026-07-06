Feature: Slim /fpl/bootstrap-static-slim endpoint

  The /fpl/bootstrap-static-slim endpoint projects the cached bootstrap-static
  blob down to the fields the UI renders, returning ~16KB instead of shipping
  the full ~210KB raw bootstrap to the client. The raw /fpl/bootstrap-static/
  passthrough stays available as a fallback.

  Scenario: Slim cache hit returns cached payload without recomputing
    Given the slim bootstrap cache is warm
    When a client requests /fpl/bootstrap-static-slim
    Then the worker returns the cached slim payload
    And the upstream FPL API is not called

  Scenario: KV bootstrap hit recomputes a slim payload with only rendered fields
    Given the raw bootstrap blob is cached but the slim cache is empty
    When a client requests /fpl/bootstrap-static-slim
    Then the slim payload exposes exactly the declared element fields
    And the heavy top-level bootstrap blocks are dropped
    And the slim payload is written back to KV with a 1-hour TTL
    And the upstream FPL API is not called

  Scenario: KV miss falls back to upstream fetch
    Given no raw or slim bootstrap is cached
    When a client requests /fpl/bootstrap-static-slim
    Then the worker fetches bootstrap-static from upstream
    And the raw blob is cached with a 1-hour TTL and a slim payload returned
