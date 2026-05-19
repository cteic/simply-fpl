Feature: Threats — players nearby managers own that you don't

  Scenario: Players the user already owns are excluded from threats
    Given the user owns player 1 and the cohort also has player 1 in their squads
    When I compute the threats
    Then player 1 should not appear in the threat list

  Scenario: Threats are ranked by projected rank impact
    Given the cohort owns player 50 at 80% and player 60 at 20%
    When I compute the threats
    Then player 50 should appear before player 60 in the threat list

  Scenario: Empty cohort returns no threats
    Given the cohort has no managers
    When I compute the threats
    Then the threat list should be empty
