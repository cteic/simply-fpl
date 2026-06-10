Feature: Replay clock

  The replay clock drives the "season in an hour" demo. Time is advanced via
  pure tick functions so the clock is deterministic and testable without a
  React renderer. At speed 1x one gameweek takes the configured duration; at
  60x it takes 1/60 of that. The clock exposes play, pause, restart, seek and
  setSpeed; it freezes on the final gameweek instead of running off the end.

  Scenario: A new clock starts paused at the first gameweek
    Given a replay clock with start GW 1 and end GW 38
    Then the clock is paused at GW 1
    And the GW progress is 0

  Scenario: A single tick at 60x advances exactly one gameweek per second
    Given a playing replay clock at speed 60 with 60000ms gameweek duration
    When the clock advances 1000ms
    Then the clock is at GW 2 with progress 0

  Scenario: A tick mid-gameweek leaves the clock partway through the same GW
    Given a playing replay clock at speed 1 with 60000ms gameweek duration
    When the clock advances 30000ms
    Then the clock is at GW 1 with progress 0.5

  Scenario: Playing past the end leaves the clock finished on the final GW
    Given a playing replay clock at speed 60 with 60000ms gameweek duration starting at GW 37 ending at GW 38
    When the clock advances 10000ms
    Then the clock is finished at GW 38 with progress 1

  Scenario: Seeking jumps to the start of the requested gameweek
    Given a paused replay clock at GW 5
    When the clock seeks to GW 17
    Then the clock is paused at GW 17
    And the GW progress is 0

  Scenario: Restarting from the finished state plays again from the start
    Given a finished replay clock with start GW 1 and end GW 38
    When the clock is restarted
    Then the clock is at GW 1 with progress 0
    And the clock is playing
