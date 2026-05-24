Feature: Home unified dashboard (feature-flagged)

  Phase 1 of the single-page architecture. With `?unified=1` (dev override)
  or NEXT_PUBLIC_FEATURE_HOME_UNIFIED=true, `/` renders a stacked dashboard
  composing the existing live-rank, threats, effective-ownership and rivals
  surfaces as sections — no route navigation required. Leagues lives on its
  own /leagues route.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And a team id is saved in storage

  Scenario: Unified dashboard renders all sections without page errors
    When I visit the home page with the unified flag override
    Then no page error should have occurred
    And the unified dashboard contains all four sections

  Scenario: Threats playing-status filter narrows the visible players
    When I visit the home page with the unified flag override
    And I filter threats by "Didn't Play"
    Then the threats section shows "Watkins"
    And the threats section hides "M.Salah"
