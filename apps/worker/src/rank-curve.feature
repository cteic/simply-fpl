Feature: Rank curve endpoint

  /fpl/rank-curve samples the global classic league to build FPL's own
  points-to-rank mapping for the latest settled gameweek. The live-rank
  estimate reads this instead of modelling a score distribution.

  Scenario: The settled gameweek is the one FPL has finished checking
    Given a bootstrap where GW11 is finished and checked while GW12 is next
    When I ask for the latest settled event
    Then it is GW11

  Scenario: is_current does not mean in progress
    Given a bootstrap where the current gameweek is unfinished
    When I ask for the latest settled event
    Then no settled event is found

  Scenario: Sampling the global league builds a usable curve
    Given a bootstrap where GW11 is finished and checked while GW12 is next
    And the global league serves a monotonic page for every sampled page
    When I request the rank curve
    Then the curve covers the settled gameweek and the ranked count
    And the curve points descend by total and ascend by rank
    And the curve is cached under the gameweek's own key

  Scenario: A cached curve is served without touching upstream
    Given a bootstrap where GW11 is finished and checked while GW12 is next
    And the gameweek's curve is already cached
    When I request the rank curve
    Then the cached curve is returned
    And the global league was never sampled

  Scenario: Pages that fail are skipped rather than failing the build
    Given a bootstrap where GW11 is finished and checked while GW12 is next
    And the global league fails every third sampled page
    When I request the rank curve
    Then the curve is still built from the pages that answered

  Scenario: Before any gameweek settles there is no curve to serve
    Given a bootstrap where the current gameweek is unfinished
    When I request the rank curve
    Then the response reports that no gameweek has settled
