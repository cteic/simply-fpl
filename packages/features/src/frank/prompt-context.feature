Feature: Frank enriched prompt context

  buildEnrichedContext enriches a user's FPL squad snapshot with player names,
  upcoming fixture difficulty ratings, and price-change predictions so Frank can
  reason about the squad specifically rather than from generic weekly advice.

  computeFrankAskCacheKey produces a deterministic cache key from a question and
  squad composition so identical asks are never sent to Anthropic twice.

  Scenario: Enriched context includes player names and team for each squad pick
    Given a snapshot with one pick: player id 1 named "Salah" on team "LIV"
    And no fixtures
    And no price changes
    When buildEnrichedContext is called
    Then the context JSON contains a squad entry with name "Salah" and team "LIV"

  Scenario: Enriched context includes next-3 fixture difficulty ratings
    Given a snapshot with one pick: player id 1 on team id 1
    And fixtures for GW11, GW12, GW13 giving team 1 difficulties 2, 3, 4
    And no price changes
    When buildEnrichedContext is called with currentGw 10
    Then the squad entry for player id 1 has next_fdr [2, 3, 4]

  Scenario: Enriched context includes price direction for a squad player
    Given a snapshot with one pick: player id 1 named "Salah"
    And no fixtures
    And player id 1 is predicted to rise in price
    When buildEnrichedContext is called
    Then the squad entry for player id 1 has price_dir "rise"

  Scenario: Snapshot without picks returns entry summary only
    Given a snapshot with no picks
    When buildEnrichedContext is called
    Then the context JSON contains overall_rank but no squad key

  Scenario: Identical question and squad produce the same cache key
    Given the question "Who should I captain?" and squad [1, 2, 3]
    When computeFrankAskCacheKey is called twice with the same inputs
    Then both cache keys are equal and start with "frank:ask:"

  Scenario: Question normalisation ignores casing and extra whitespace
    Given the normalised question "  Who Should I Captain?  " and squad [1, 2, 3]
    And the normalised question "who should i captain?" and squad [1, 2, 3]
    When computeFrankAskCacheKey is called for each
    Then the two cache keys are equal
