Feature: Price changes

  FPL publishes its own threshold progress, hourly rate and three-day
  projection per player, so we read those rather than guess from net
  transfers. The legacy estimate survives only for payloads that carry none of
  the official fields.

  Scenario: Format price from FPL tenths notation
    Given a price value of 55 in FPL tenths
    When I format the price
    Then it should display as £5.5m

  Scenario: Format price for a premium player
    Given a price value of 135 in FPL tenths
    When I format the price
    Then it should display as £13.5m

  Scenario: FPL's own figures drive direction and progress
    Given a bootstrap carrying FPL's price-change fields
    When I read the price changes
    Then the riser is marked as a rise and the faller as a fall
    And each row reports FPL's threshold progress
    And each row carries the projection, hourly rate and lock state
    And the rows are sourced from FPL

  Scenario: The list is ordered by how close a change is
    Given a bootstrap carrying FPL's price-change fields
    When I read the price changes
    Then the player closest to a change comes first

  Scenario: A player barely moving is left out
    Given a bootstrap carrying FPL's price-change fields
    When I read the price changes
    Then a player sitting at zero progress does not appear

  Scenario: Only FPL's own confidence reaches certainty
    Given a bootstrap carrying FPL's price-change fields
    When I read the price changes
    Then a likelihood of 5 reads as certain
    And a likelihood of 2 does not

  Scenario: Payloads without the official fields fall back to net transfers
    Given a bootstrap with no price-change fields and heavy net transfers in
    When I read the price changes
    Then that player is still predicted to rise
    And the row is marked as an estimate rather than official

  Scenario: The fallback never claims certainty it cannot support
    Given a bootstrap with no price-change fields and twenty mildly traded players
    When I read the price changes
    Then no row claims certainty
    And every row is flagged as still calibrating
