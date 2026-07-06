Feature: Home cohort comparison table

  The home live-rank view shows a cohort comparison once live aggregates
  exist, comparing the manager's score against the Top 10k / Overall /
  Top 1k tiers. While aggregates are being fetched it shows a skeleton;
  if the worker 404s or is unreachable it shows "Cohort data unavailable".

  Background:
    Given the Worker returns deterministic FPL fixtures

  Scenario: Cohort table compares the manager against each tier when aggregates exist
    Given a team id is saved in storage
    And the Worker returns deterministic cohort aggregates for gameweek 37
    When I visit the home page
    Then no page error should have occurred
    And the cohort table compares my score against each tier

  Scenario: Cohort comparison shows an unavailable message without aggregates
    Given a team id is saved in storage
    And the Worker returns 404 for the cohort aggregates endpoint
    When I visit the home page
    Then no page error should have occurred
    And the cohort comparison shows a data unavailable message
