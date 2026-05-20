Feature: EO computed from cohort aggregates

  Scenario: Aggregate payload produces real EO rows via the pipeline
    Given a top-10k aggregate payload with player 351 owned 78% and captained 41%
    When effective ownership is computed from the aggregate
    Then player 351 appears with Top 10k EO of 119 and non-zero rows are returned

  Scenario: avg_event_points is faithfully preserved per tier
    Given a top-10k snapshot with avg_event_points of 58
    When I read avg_event_points for the top-10k tier
    Then the value is 58
