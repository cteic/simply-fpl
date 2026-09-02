Feature: League press derivation

  buildLeaguePress turns a mini-league standings page into the weekly gazette
  beats: leader, title race, top score, sack watch and biggest climb.

  Scenario: The leader and chaser gap are derived from the standings
    Given a league where GW King FC lead Saka Boom by 3 points
    When buildLeaguePress is called
    Then the leader is "GW King FC" and the chaser gap is 3

  Scenario: A close gap at the top makes it a rivalry week
    Given a league where GW King FC lead Saka Boom by 3 points
    When buildLeaguePress is called
    Then it is a rivalry week

  Scenario: A wide gap at the top is not a rivalry week
    Given a league where the leader is 40 points clear
    When buildLeaguePress is called
    Then it is not a rivalry week

  Scenario: Top score and sack watch come from the gameweek totals
    Given a league of four with distinct gameweek scores
    When buildLeaguePress is called
    Then the top score names the best gameweek and sack watch names the worst

  Scenario: Sack watch is suppressed in a two-manager league
    Given a league with only two managers
    When buildLeaguePress is called
    Then there is no sack watch

  Scenario: The biggest climb picks the largest rank gain
    Given a league where one manager climbed four places
    When buildLeaguePress is called
    Then the biggest climb is that manager with 4 places

  Scenario: Your rank is reported when your entry is in the league
    Given a league where entry 42 sits second
    When buildLeaguePress is called for entry 42
    Then your rank is 2

  Scenario: A paginated league suppresses week-wide beats
    Given a league whose standings continue onto another page
    When buildLeaguePress is called
    Then top score, sack watch and biggest climb are absent

  Scenario: An empty standings page yields no press
    Given a league with no standings results
    When buildLeaguePress is called
    Then no press is returned
