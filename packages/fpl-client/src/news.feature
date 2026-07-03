Feature: Team news collation

  collateTeamNews projects FPL bootstrap player status and news fields into
  per-team groups, excluding fully available players with no news string.

  Scenario: Player with doubt chance-of-playing is included
    Given a bootstrap with a player who has a 75% chance of playing next round
    When collateTeamNews is called
    Then the player appears in their team's group with status "doubt"

  Scenario: Fully available player with no news is excluded
    Given a bootstrap with a player who has no news and a null chance-of-playing
    When collateTeamNews is called
    Then no team groups are returned

  Scenario: Player with suspended status is included
    Given a bootstrap with a player whose FPL status field is "s"
    When collateTeamNews is called
    Then the player appears with status "suspended"

  Scenario: Player with injured status is included
    Given a bootstrap with a player whose FPL status field is "i"
    When collateTeamNews is called
    Then the player appears with status "injured"

  Scenario: Player with zero chance-of-playing and no status falls back to injured
    Given a bootstrap with a player whose chance-of-playing is 0 and status is absent
    When collateTeamNews is called
    Then the player appears with status "injured"

  Scenario: Players from multiple teams are grouped by club
    Given a bootstrap with players from Arsenal and Chelsea both having news
    When collateTeamNews is called
    Then two team groups are returned sorted alphabetically by team name

  Scenario: filterNewsForPicks returns only squad players
    Given collated team news containing players from multiple clubs
    When filterNewsForPicks is called with a set containing only one player's id
    Then only that player is returned
