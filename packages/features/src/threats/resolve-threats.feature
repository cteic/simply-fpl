Feature: Resolving threats from the best ownership data available

  The threats list ranks the players a manager does not own by how much rank
  they could cost. It needs ownership figures. A sampled top-10k cohort is the
  sharper source; FPL's own overall ownership is the fallback. Placeholder rows
  are never an option: a list that cannot be computed is empty.

  Scenario: Overall ownership drives the list when no cohort is available
    Given a bootstrap where an unowned player is in 60 percent of squads
    When I resolve threats without a cohort
    Then that player is listed with 60 percent ownership
    And the list is marked as coming from the field
    And a player below the ownership floor is left out
    And a player the manager owns is left out

  Scenario: A sampled cohort takes precedence over the field
    Given a bootstrap where an unowned player is in 60 percent of squads
    When I resolve threats with a top-10k cohort that starts them in 90 percent of teams
    Then that player is listed with 90 percent ownership
    And the list is marked as coming from the top 10k

  Scenario: An empty cohort does not masquerade as a sample
    Given a bootstrap where an unowned player is in 60 percent of squads
    When I resolve threats with a cohort that sampled nobody
    Then the list is marked as coming from the field
