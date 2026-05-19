Feature: Effective ownership splits by rank tier

  Scenario: EO sums raw ownership and captaincy percentages
    Given a player owned by 50% of Top 10k managers and captained by 30% of them
    When I compute effective ownership for that tier
    Then the player's Top 10k EO should be 80

  Scenario: Rows are sorted by Top 10k EO descending
    Given player 1 has Top 10k EO 90 and player 2 has Top 10k EO 30
    When I compute effective ownership
    Then player 1 should appear before player 2

  Scenario: Missing tier data defaults to zero
    Given a player has Top 10k stats but no Top 1k stats
    When I compute effective ownership
    Then the player's Top 1k EO should be 0
