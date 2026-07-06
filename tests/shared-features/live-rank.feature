Feature: Live rank maths — platform-agnostic

  This feature file is the source of truth for live rank calculations.
  It is consumed by both web and mobile step definitions; only the
  step definition files differ per platform.

  Scenario: Live GW points sum all XI players with correct multipliers
    Given a starting XI where each player scores 5 points
    And the captain scores 6 points
    When live points are calculated
    Then the total should include the captain's doubled contribution

  Scenario: Captain's points are doubled with no active chip
    Given a squad where the captain scores 8 points
    When live points are calculated with no active chip
    Then the captain contributes 16 points to the total

  Scenario: Triple Captain chip triples the captain's points
    Given a squad where the captain scores 10 points
    And the Triple Captain chip is active
    When live points are calculated
    Then the captain contributes 30 points

  Scenario: Transfer hit is deducted from the live total
    Given a squad with 4-point transfer hits
    And XI players each scoring 5 points
    When live points are calculated
    Then the total is reduced by 4

  Scenario: Rank improves when live score beats the pre-GW average
    Given a manager ranked 1000000 at the start of the gameweek
    And the gameweek average score is 50
    And the manager is currently scoring 80 live points
    When rank details are computed
    Then the estimated post-GW rank is better than 1000000
