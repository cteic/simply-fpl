Feature: Post-subs autosubs

  Scenario: A 0-min starter is replaced by an eligible bench player
    Given a squad with a 0-min midfielder starting and a 60-min midfielder on the bench
    When I apply autosubs
    Then the bench midfielder is promoted to the starting XI
    And the 0-min starter is moved to the bench

  Scenario: No eligible bench player means no substitution
    Given a squad with a 0-min midfielder starting and no bench players who played minutes
    When I apply autosubs
    Then the starting XI is unchanged

  Scenario: A 0-min goalkeeper is swapped only for the bench goalkeeper
    Given a squad with a 0-min starting goalkeeper and a 90-min bench goalkeeper
    When I apply autosubs
    Then the bench goalkeeper is promoted to the starting XI

  Scenario: A formation-invalid bench candidate is skipped
    Given a squad whose starting XI already has 3 defenders and a 0-min defender
    And the only candidate bench player is a forward that would break the formation
    When I apply autosubs
    Then the starting XI is unchanged

  Scenario: Bench Boost suppresses autosubs entirely
    Given a squad with Bench Boost active and a 0-min starter
    When I apply autosubs
    Then the picks are returned unchanged
