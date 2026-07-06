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
