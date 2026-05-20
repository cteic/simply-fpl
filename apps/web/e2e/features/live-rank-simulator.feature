Feature: Live rank updates from a replayed gameweek

  The full-stack simulator (RFC 005, issue #173) replays a recorded gameweek:
  the worker streams recorded /event/{gw}/live/ snapshots over the live
  websocket and the live-rank surface updates as the simulated gameweek plays,
  exactly as it would during a real gameweek.

  Scenario: Live-rank surface updates as the simulated gameweek replays
    Given a team id is saved in storage for the simulator
    And the worker serves deterministic FPL fixtures for the simulator
    And the simulator is replaying the gw37 recording over the live websocket
    When I open the live-rank page for the simulator
    Then the live-rank surface renders my replayed team
    And the gameweek points climb to the recorded full-time total
