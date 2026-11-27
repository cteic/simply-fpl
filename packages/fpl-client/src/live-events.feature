Feature: Live squad events

  FPL publishes running totals for each player, not a feed of events. Comparing
  two refreshes of the live data shows what just happened to a manager's squad,
  which is what the in-app goal alerts are built on.

  Scenario: Opening the app mid-gameweek replays nothing
    Given a live feed with no earlier snapshot to compare against
    When I diff the squad events
    Then there are no events

  Scenario: A goal by a starter is reported with the points it earned
    Given a starter who has scored since the last refresh
    When I diff the squad events
    Then one goal event names that player
    And it carries the points the manager gained

  Scenario: The captain's points are doubled
    Given the captain has scored since the last refresh
    When I diff the squad events
    Then the event is marked as the captain
    And the points gained are doubled

  Scenario: A benched player's goal is reported but earns nothing
    Given a benched player who has scored since the last refresh
    When I diff the squad events
    Then the event is marked as on the bench
    And it carries no points

  Scenario: Bench boost makes a benched player count
    Given a benched player who has scored while bench boost is active
    When I diff the squad events
    Then the event is not marked as on the bench
    And it carries the points the manager gained

  Scenario: A goal and bonus in one refresh do not double count
    Given a starter who gained a goal and two bonus since the last refresh
    When I diff the squad events
    Then three events are reported for that player
    And the points gained are counted once across them

  Scenario: A revoked clean sheet is reported as a loss
    Given a defender whose clean sheet has been taken away
    When I diff the squad events
    Then a lost clean sheet event is reported with negative points

  Scenario: A player outside the squad is ignored
    Given a player the manager does not own has scored
    When I diff the squad events
    Then there are no events
