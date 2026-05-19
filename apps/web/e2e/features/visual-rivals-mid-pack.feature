Feature: Rivals visual regression (8-manager league, user mid-pack)

  Visual guardrail for the rivals view (route /rivals/[leagueId]) shipped in
  PR #197 (feat/rivals-view-foundation). Catches Tamagui / hydration regressions
  of the kind that took prod down on 2026-05-15 (CSSStyleDeclaration indexed
  setter crash that left the app fully unrenderable).

  Background:
    Given the Worker returns deterministic FPL fixtures
    And the Worker returns an 8-manager rivals league with the user mid-pack

  Scenario: Rivals page renders without crashing for a saved team in an 8-manager league
    Given a team id is saved in storage
    When I visit the rivals page for league 8888
    Then no page error should have occurred
    And the rendered page matches the snapshot "rivals-mid-pack-league-8"
