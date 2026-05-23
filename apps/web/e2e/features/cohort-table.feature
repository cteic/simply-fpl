Feature: Home cohort comparison table

  The home live-rank view shows a cohort comparison once live aggregates
  exist, comparing the manager's score against the Top 10k / Overall /
  Legendary tiers. Until aggregates exist it shows a "coming soon"
  placeholder rather than a wall of empty cells.

  Background:
    Given the Worker returns deterministic FPL fixtures

  Scenario: Cohort table compares the manager against each tier when aggregates exist
    Given a team id is saved in storage
    And the Worker returns deterministic cohort aggregates for gameweek 37
    When I visit the home page
    Then no page error should have occurred
    And the cohort table compares my score against each tier

  Scenario: Cohort comparison shows a coming-soon placeholder without aggregates
    Given a team id is saved in storage
    When I visit the home page
    Then no page error should have occurred
    And the cohort comparison shows a coming-soon placeholder
