Feature: Mobile nav exposes live rank and leagues

  The 54px top bar must keep the live rank pill and the Leagues link
  reachable on phones, in both portrait and landscape. Regression guard for
  the sm-breakpoint hide that removed both on mobile (only the logo showed).

  Background:
    Given the Worker returns deterministic FPL fixtures
    And a team id is saved in storage

  Scenario: Phone portrait keeps the live rank pill and the Leagues link
    When I visit the home page on a phone in portrait
    Then no page error should have occurred
    And the live rank pill shows the rank
    And the nav shows the Leagues link

  Scenario: Phone landscape keeps the live rank pill and the Leagues link
    When I visit the home page on a phone in landscape
    Then no page error should have occurred
    And the live rank pill shows the rank
    And the nav shows the Leagues link
