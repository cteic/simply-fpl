Feature: Slim league projection

  buildSlimLeague projects a raw FPL classic-league standings response down to
  the declared FplLeague shape, dropping the new_entries block, last_updated_data
  and league metadata the league and rivals views never read.

  Scenario: Slim league keeps the standings the rivals view renders
    Given a raw classic-league standings response
    When the worker slims the league
    Then the league name and standings results are preserved
    And the new_entries block and league metadata are dropped
