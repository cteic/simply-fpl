Feature: gw38 live capture to R2

  During the gw38 capture window the LiveGwDO tees each live snapshot to an R2
  recording in addition to its normal client fan-out. Outside the window the
  capture is a no-op. The recorded rows match the shape of the existing gw36
  recording so the replay path can read them back unchanged.

  Scenario: Capture is a no-op outside the gw38 window
    Given an R2 recording bucket
    When a gw38 snapshot is captured at "2026-05-24T13:59:59.000Z"
    Then nothing is written to R2

  Scenario: Capture writes a jsonl row inside the window
    Given an R2 recording bucket
    When a gw38 snapshot is captured at "2026-05-24T15:30:00.000Z"
    Then the recording has one jsonl row for gw 38

  Scenario: Captured rows match the gw36 recording row shape
    Given an R2 recording bucket
    When a gw38 snapshot is captured at "2026-05-24T15:30:00.000Z"
    Then the captured row has the same shape as a gw36 recording row
