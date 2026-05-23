Feature: Head-to-head surfaces an error when a manager fails to load

  Regression: if any of the head-to-head queries errors, the view must show a
  clear error state instead of spinning on "Loading…" forever.

  Scenario: One manager's data fails to load
    Given the Worker fails to load the second manager for the head-to-head scenario
    When I visit the head-to-head page with a failing manager
    Then I see the matchup load error
