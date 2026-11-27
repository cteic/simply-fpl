Feature: Season story

  A manager's season so far, from FPL's own settled gameweek history: the rank
  after each gameweek, which way it moved, and the runs and records that fall
  out of it. Nothing here is estimated.

  Scenario: Arrows follow the overall rank from one gameweek to the next
    Given a real eleven-gameweek season
    When I build the season story
    Then the first gameweek has no arrow
    And a better rank than the week before is a green arrow
    And a worse rank than the week before is a red arrow
    And the arrow totals match the season

  Scenario: Records are picked out of the season
    Given a real eleven-gameweek season
    When I build the season story
    Then the best rank is the lowest overall rank and its gameweek
    And the best gameweek is the highest score
    And bench points and transfer hits are totalled

  Scenario: The streak counts back from the latest gameweek
    Given a season that ends on three green arrows
    When I build the season story
    Then the streak is three green

  Scenario: A manager with no ranked gameweeks has an empty story
    Given a history with no ranked gameweeks
    When I build the season story
    Then the trajectory is empty and nothing is invented

  Scenario: The sparkline plots the real trajectory with the best rank on top
    Given a real eleven-gameweek season
    When I build the sparkline points
    Then there is one point per gameweek
    And the best rank sits highest and the worst lowest
    And a single gameweek yields no line at all
