Feature: Live rank falls back to HTTP polling when WebSocket fails

  The DO is optional, not load-bearing (RFC 001 §7). When the live-fanout
  WebSocket cannot be established, the React Query HTTP path keeps the
  live-rank surface working — degraded freshness, same UI.

  Scenario: Live rank renders user picks via HTTP fallback when WS upgrade fails
    Given a team id is saved in storage for fallback
    And the Worker WebSocket upgrade fails for every attempt
    And the Worker returns deterministic FPL fixtures for fallback
    When I visit the home page for fallback
    Then the live-rank surface should render my picks via HTTP fallback
