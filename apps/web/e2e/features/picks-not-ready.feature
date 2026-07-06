Feature: Live rank shows a calm state when picks are not ready

  Regression: a manager whose squad is not confirmed for the current gameweek
  (a brand-new entry, or before the deadline) must see a calm "no picks yet"
  message rather than the "Could not load this team" error.

  Scenario: A saved team with no picks for the current gameweek
    Given the Worker returns a snapshot with no picks for the current gameweek
    And a team id is saved in storage for the picks-not-ready scenario
    When I visit the home page for the picks-not-ready scenario
    Then I see the no-picks-yet message
    And I do not see the team load error
