Feature: /news/teams and /news/entry/:id worker endpoints

  The news module collates player injury/suspension data from bootstrap-static
  into KV and serves it via two endpoints.

  Scenario: Team news cache hit skips recomputation
    Given the news:teams key is warm in KV
    When handleNewsTeams is called
    Then the cached payload is returned
    And the upstream FPL API is not called

  Scenario: Team news cache miss computes from cached bootstrap
    Given no news:teams cache but bootstrap-static is cached with a doubtful player
    When handleNewsTeams is called
    Then the collated payload is computed from the cached bootstrap
    And the result is written to KV with the 30-minute TTL

  Scenario: Team news falls back to upstream when bootstrap not cached
    Given neither news:teams nor bootstrap-static is cached
    When handleNewsTeams is called
    Then the worker fetches bootstrap-static from upstream
    And returns a collated payload

  Scenario: Entry news returns only squad players with news
    Given bootstrap is cached with two doubtful players on different clubs
    And entry picks contain only one of those players
    When handleEntryNews is called for that entry
    Then only the player in the squad is returned

  Scenario: Entry news returns empty list when no current event
    Given bootstrap is cached but has no current event
    When handleEntryNews is called
    Then an empty players list is returned with status 200

  Scenario: warmNewsCache writes collated news to KV
    Given bootstrap-static is cached with one doubtful player
    When warmNewsCache is called
    Then the news:teams key is written to KV with the 30-minute TTL
