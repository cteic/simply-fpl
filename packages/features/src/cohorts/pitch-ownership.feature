Feature: Top 10k ownership on the live pitch

  The pitch can show either global ownership (default) or per-player Top 10k
  ownership sampled live during the gameweek. The Top 10k sample is built up
  over the gameweek, so it may be thin or absent. When a player is missing from
  the sample the pitch must fall back to that player's global ownership and
  never render an empty or NaN value.

  Scenario: Top 10k ownership is shown when the cohort sample has the player
    Given a top-10k cohort sample where player 351 is owned by 78%
    And player 351 has a global ownership of 45.0%
    When pitch ownership is resolved for player 351 in Top 10k mode
    Then the displayed ownership is 78% sourced from the top-10k sample

  Scenario: Falls back to global ownership when the sample is missing the player
    Given a top-10k cohort sample that does not include player 999
    And player 999 has a global ownership of 12.5%
    When pitch ownership is resolved for player 999 in Top 10k mode
    Then the displayed ownership is 12.5% sourced from global ownership
    And the resolved value is a finite number

  Scenario: Falls back to global ownership when no cohort sample exists yet
    Given no top-10k cohort sample is available
    And player 42 has a global ownership of 7.3%
    When pitch ownership is resolved for player 42 in Top 10k mode
    Then the displayed ownership is 7.3% sourced from global ownership
    And the resolved value is a finite number
