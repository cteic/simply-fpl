Feature: Slim bootstrap projection

  buildSlimBootstrap projects a raw FPL bootstrap-static blob down to the
  declared FplBootstrapStatic shape so the worker can ship ~16KB instead of
  ~210KB gzipped, without changing what any typed consumer renders.

  Scenario: Slim bootstrap keeps only the rendered fields
    Given a raw bootstrap with heavy upstream-only fields
    When the worker slims the bootstrap
    Then each element exposes exactly the declared FplPlayer fields
    And rendered element fields keep their real values
    And unread element fields are blanked
    And heavy upstream-only fields are dropped from elements
    And teams, events and element types keep their declared fields only
    And the fields the rank estimator and price view read survive the trip

  Scenario: Slim bootstrap carries the fields our own features depend on
    Given a raw bootstrap with heavy upstream-only fields
    When the worker slims the bootstrap
    Then the event keeps ranked_count and data_checked
    And the element keeps FPL's own price-change fields
    And the bootstrap keeps total_players
