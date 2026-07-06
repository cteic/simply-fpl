Feature: Leagues view — mobile

  Scenario: System leagues are excluded from display
    Given a list of classic leagues including one with league_type s
    When the leagues are filtered
    Then the system league is not in the result

  Scenario: At most five leagues are shown
    Given a manager belonging to 8 classic leagues
    When the leagues are sliced to the display cap
    Then only 5 leagues appear

  Scenario: Entry endpoint returns leagues for a valid team ID
    Given the entry endpoint returns two classic leagues for team 42
    When the entry is fetched for team 42
    Then the response contains two classic leagues

  Scenario: Entry endpoint error is surfaced as a thrown error
    Given the entry endpoint returns a 404 for team 99
    When the entry is fetched for team 99
    Then an error is thrown containing 404
