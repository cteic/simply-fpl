Feature: Header theme toggle

  The theme toggle lives in the header (Stadium / Bold / Quiet). Switching a
  theme applies it across the site and persists across reloads via localStorage.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And a team id is saved in storage

  Scenario: Switching to Bold from the header applies and persists
    When I visit the home page
    And I select the "Bold" theme from the header
    Then the active theme is "bold"
    And reloading the page keeps the "bold" theme

  Scenario: Switching to Quiet from the header applies and persists
    When I visit the home page
    And I select the "Quiet" theme from the header
    Then the active theme is "quiet"
    And reloading the page keeps the "quiet" theme
