Feature: Home unified dashboard — marketing hero (pre-team-id)

  Phase 3 of the single-page architecture. When the unified flag is on and
  no team id is saved, `/` shows a marketing hero — headline, value props,
  a frozen dashboard screenshot and an entry-id input — instead of the bare
  search form. Saving a team id transitions to the dashboard.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And no team is saved in storage

  Scenario: Cold visitor sees the marketing hero with the unified flag
    When I visit the home page with the unified flag override
    Then no page error should have occurred
    And the marketing hero is visible
    And the marketing hero shows the three value props

  Scenario: Saving a team id from the hero reveals the dashboard
    When I visit the home page with the unified flag override
    And I enter team id "1" in the hero and submit
    Then the unified dashboard contains all three sections
