Feature: Detailed league row presentation

  Scenario: Tapping a collapsed row expands it, tapping again collapses it
    Given a collapsed detailed league row
    When the row is toggled
    Then the row is expanded
    When the expanded row is toggled
    Then the row is collapsed

  Scenario: Bench waste line is shown when bench points are non-zero
    Given a row where 12 bench points were wasted
    When the row view is built
    Then the bench waste line reads "12 pts wasted"

  Scenario: Bench waste line is hidden when no bench points were wasted
    Given a row where no bench points were wasted
    When the row view is built
    Then the bench waste line is hidden

  Scenario: The user's own row is highlighted
    Given a row that belongs to the user
    When the row view is built
    Then the row is highlighted

  Scenario: A rival's row is not highlighted
    Given a row that belongs to a rival
    When the row view is built
    Then the row is not highlighted

  Scenario: Captain cell shows name with multiplier-adjusted points
    Given a row captained by Palmer scoring 14 with a triple-captain chip
    When the row view is built
    Then the captain cell reads "Palmer (TC) · 42"

  Scenario: Transfers read out and in without strikethrough and surface the hit
    Given a row that moved out Bowen and in Welbeck for a 4 point hit
    When the row view is built
    Then the transfer summary out reads "Bowen"
    And the transfer summary in reads "Welbeck"
    And the transfer hit reads "-4"
