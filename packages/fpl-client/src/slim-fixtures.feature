Feature: Slim fixtures projection

  buildSlimFixtures projects raw FPL fixtures down to the declared FplFixture
  shape, dropping the per-fixture stats array (and other upstream-only fields)
  that balloon once matches are live, without losing any field the FDR grid,
  bonus prediction or playing-status checks read.

  Scenario: Slim fixtures drop the per-fixture stats blob
    Given a raw fixtures list carrying a stats array
    When the worker slims the fixtures
    Then each fixture exposes exactly the declared FplFixture fields
    And the FDR, kickoff and result fields keep their real values
    And the heavy upstream-only fields are dropped
