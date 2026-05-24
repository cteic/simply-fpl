Feature: Deselect team from the status pill

  The live status pill in the nav shows the saved team id beside the live rank,
  with a deselect control that clears the saved team and returns the visitor to
  the search home.

  Background:
    Given the Worker returns deterministic FPL fixtures

  Scenario: Deselecting from the status pill clears the team and returns home
    Given a team id is saved in storage
    When I visit the home page
    Then the status pill shows a deselect control
    When I deselect the team from the status pill
    Then the home search hero is shown
