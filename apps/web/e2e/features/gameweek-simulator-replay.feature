Feature: Gameweek simulator replay

  End-to-end sanity check for the worker replay mode. The live WebSocket is
  mocked to emit frames from an archived-gameweek recording fixture; the
  live-rank view must reflect each emitted frame, proving the replay pipeline
  works and that GW points update as the gameweek plays back.

  Scenario: Live-rank GW points update as archived-gameweek recording plays back
    Given a team id is saved in storage for the replay scenario
    And the Worker is mocked with replay recording "gw38-recording.ndjson"
    When I open the live-rank view for the replay scenario
    Then the GW points tile should change across at least two replayed frames
