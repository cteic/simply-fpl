Feature: Home unified dashboard — rivals league picker

  Phase 3 of the single-page architecture. The rivals section (previously a
  stub) now reads the saved team's classic mini-leagues and renders a picker;
  selecting a league shows the rivals board for it — no /rivals/[leagueId]
  route needed.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And a team id is saved in storage

  Scenario: Rivals section renders a league picker for the saved team
    When I visit the home page with the unified flag override
    Then no page error should have occurred
    And the rivals league picker is visible
    And the rivals league picker lists the team's mini-leagues
