Feature: Prod routes render guardrail

  Visual regression guardrail covering every prod route in two user states.
  Each scenario asserts the page renders without any pageerror (catching
  total-app-crash regressions like the 2026-05-15 CSSStyleDeclaration
  indexed-property-setter bug) and snapshots the rendered DOM.

  Background:
    Given the Worker returns deterministic FPL fixtures

  Scenario: Home renders for a visitor with no saved team
    Given no team is saved in storage
    When I visit the home page
    Then no page error should have occurred
    And the rendered page matches the snapshot "home-no-team"

  Scenario: Home renders rank for a visitor with a saved team
    Given a team id is saved in storage
    When I visit the home page
    Then no page error should have occurred
    And the rendered page matches the snapshot "home-with-team"

  Scenario: /rank/<id> redirects to home
    Given a team id is saved in storage
    When I visit the live rank page for entry 1
    Then no page error should have occurred
    And the rendered page matches the snapshot "home-with-team"

  Scenario: Head-to-head page renders for a visitor with no saved team
    Given no team is saved in storage
    When I visit the head-to-head page for entries 1 and 2
    Then no page error should have occurred
    And the rendered page matches the snapshot "h2h-no-team"

  Scenario: Head-to-head page renders for a visitor with a saved team
    Given a team id is saved in storage
    When I visit the head-to-head page for entries 1 and 2
    Then no page error should have occurred
    And the rendered page matches the snapshot "h2h-with-team"

  Scenario: Status page renders for a visitor with no saved team
    Given no team is saved in storage
    When I visit the status page
    Then no page error should have occurred
    And the rendered page matches the snapshot "status-no-team"

  Scenario: Status page renders for a visitor with a saved team
    Given a team id is saved in storage
    When I visit the status page
    Then no page error should have occurred
    And the rendered page matches the snapshot "status-with-team"
