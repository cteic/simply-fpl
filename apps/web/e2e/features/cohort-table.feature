Feature: GW38 cohort comparison table

  Dress-rehearsal cohort table on the home live-rank view. Surface-only
  guardrail: assert the four-column / four-row scaffold renders for a saved
  team. Real cohort numbers swap in later in the week.

  Background:
    Given the Worker returns deterministic FPL fixtures

  Scenario: Cohort table renders below the scoreboard for a saved team
    Given a team id is saved in storage
    When I visit the home page
    Then no page error should have occurred
    And the cohort table renders with four columns and four rows
