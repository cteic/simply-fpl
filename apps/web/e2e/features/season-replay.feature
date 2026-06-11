Feature: Season replay demo route

  The /replay route plays back the committed 2025–26 season archive through
  the live-rank dashboard. It is reachable by URL only — never linked from
  the primary navigation — and pulls every data file from the static
  /replay/2025-26/ bundle, so the demo works fully offline.

  Scenario: The route opens, loads the bundle and renders the live-rank dashboard
    When I open the season-replay route
    Then the replay controls are visible
    And no replay page error should have occurred
    And the live-rank dashboard renders the replay manager's team

  Scenario: Pressing play at 60x advances the gameweek pointer
    When I open the season-replay route
    And I press play at 60x on the replay controls
    Then the replay clock advances past GW 1 within five seconds
