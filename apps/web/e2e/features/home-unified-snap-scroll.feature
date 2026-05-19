Feature: Home unified dashboard — mobile snap-scroll

  Phase 2 of the single-page architecture. The dashboard container applies
  `scroll-snap-type: y proximity` and each section gets
  `scroll-snap-align: start` so mobile users land cleanly on one section
  per swipe rather than mid-content. Live-rank also fills the viewport so
  the headline rank is always above the fold on first paint.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And a team id is saved in storage

  Scenario: Each dashboard section opts into proximity snap-scroll
    When I visit the home page with the unified flag override
    Then no page error should have occurred
    And the dashboard container applies proximity snap-scroll
    And each dashboard section opts into start-aligned snap
    And the live-rank section fills the mobile viewport
