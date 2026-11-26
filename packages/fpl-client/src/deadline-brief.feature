Feature: Deadline brief

  buildDeadlineBrief splits a manager's scout events into open issues and good
  news ahead of the deadline, and counts likely game-wide price moves tonight.

  Scenario: A flagged starter is an open issue
    Given a bootstrap where a picked player is flagged at 50%
    When buildDeadlineBrief is called
    Then the brief lists one open issue and no good news

  Scenario: A predicted rise in the squad is good news, not an issue
    Given a bootstrap where a picked player has heavy net transfers in
    When buildDeadlineBrief is called
    Then the brief lists no open issues and one piece of good news

  Scenario: Game-wide price moves are counted even for players not picked
    Given a bootstrap where two non-picked players are rising and one is falling
    When buildDeadlineBrief is called
    Then the brief counts 2 rises and 1 fall tonight

  Scenario: A move FPL does not project past its threshold tonight is not counted
    Given a bootstrap where a non-picked player is drifting but not due
    When buildDeadlineBrief is called
    Then the brief counts 0 rises and 0 falls tonight
