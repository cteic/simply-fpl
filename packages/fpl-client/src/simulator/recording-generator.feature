Feature: Deterministic gameweek-simulator recording generator

  The simulator must be reproducible: the same recording and seed always
  produce the same manager pool and expected-rank curve, so cohort/live-rank
  tests never flake (RFC 005, issue #173).

  Scenario: Manager pool is reproducible for a fixed seed
    Given a 15-player squad and pool seed 20260516
    When I build a manager pool of 200 entries twice
    Then both pools are identical
    And every manager fields a legal 11-player starting XI captained from within it

  Scenario: Expected curve is reproducible and converges as my entry outscores the pool
    Given a replayed recording where my entry outscores the synthetic pool
    When I build the expected curve twice
    Then both curves are identical
    And my final live rank is better than my pre-gameweek rank
    And the official end-of-gameweek rank matches the final frame

  Scenario: Parsing a recording skips malformed rows and orders by timestamp
    Given a jsonl recording with blank, malformed and out-of-order rows
    When I parse and normalise the recording
    Then only the valid rows remain, ordered by timestamp
