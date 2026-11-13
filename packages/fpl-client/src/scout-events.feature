Feature: Scout event derivation

  deriveScoutEvents turns availability news and predicted price moves into
  Frank's scout inbox, restricted to the manager's own picks and ordered by
  severity then urgency.

  Scenario: Injured picked player yields a bad injury event
    Given a bootstrap where a picked player has FPL status "i"
    When deriveScoutEvents is called
    Then one event of kind "injury" with severity "bad" is returned

  Scenario: Doubtful picked player yields a warn doubt event
    Given a bootstrap where a picked player has a 50% chance of playing
    When deriveScoutEvents is called
    Then one event of kind "doubt" with severity "warn" is returned
    And the event carries the chance of playing and the news string

  Scenario: Availability news for a non-picked player is excluded
    Given a bootstrap where only a non-picked player has news
    When deriveScoutEvents is called
    Then no events are returned

  Scenario: Predicted fall on a picked player yields a warn price event
    Given a bootstrap where a picked player has heavy net transfers out
    When deriveScoutEvents is called
    Then one event of kind "price_fall" with severity "warn" is returned
    And the event carries a probability and net transfers

  Scenario: Predicted fall below the probability threshold is excluded
    Given a bootstrap where a picked player has mild net transfers out
    When deriveScoutEvents is called
    Then no events are returned

  Scenario: Predicted rise on a picked player yields a good price event
    Given a bootstrap where a picked player has heavy net transfers in
    When deriveScoutEvents is called
    Then one event of kind "price_rise" with severity "good" is returned

  Scenario: Price prediction for a non-picked player is excluded
    Given a bootstrap where only a non-picked player has heavy net transfers out
    When deriveScoutEvents is called
    Then no events are returned

  Scenario: Events are ordered bad, then warn, then good
    Given a bootstrap with an injured pick, a doubtful pick and a rising pick
    When deriveScoutEvents is called
    Then the events are ordered injury, doubt, price_rise

  Scenario: A player can appear in both an availability and a price event
    Given a bootstrap where a picked player is doubtful and falling in price
    When deriveScoutEvents is called
    Then two events are returned for that player
