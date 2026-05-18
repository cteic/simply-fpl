Feature: LiveGwDO replay mode

  Replay mode lets clients receive snapshot/delta messages from a recorded
  gameweek instead of the live FPL upstream. Clients cannot tell the
  difference from a live session.

  Scenario: Replay mode does not call the FPL upstream
    Given a recording with two rows is stored in KV under id "gw36-test"
    When a client connects with replay=gw36-test and speed=10
    And the replay alarm fires for every recorded row
    Then the FPL upstream is never called

  Scenario: Replay snapshot shape matches live mode
    Given a recording with two rows is stored in KV under id "gw36-test"
    When a client connects with replay=gw36-test and speed=10
    Then the client receives a snapshot message with the recorded elements

  Scenario: Speed multiplier compresses emit cadence
    Given a recording whose rows are 10 seconds apart is stored in KV under id "gw36-test"
    When a client connects with replay=gw36-test and speed=10
    Then the next alarm is scheduled roughly one second in the future
