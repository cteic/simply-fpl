Feature: Live Battle — players moving your rank right now

  Only players in currently-playing fixtures count, split into gains (pushing
  your rank up) and losses (pushing it down) by an effective-ownership-vs-field
  heuristic.

  Scenario: An owned low-ownership hauler is a large gain
    Given a fixture for team 1 is in progress
    And you own player 10 who is owned by 5% of the field and has scored 12 live points
    When I compute the live battle
    Then player 10 should be in the gains column
    And player 10 should have a positive rank impact

  Scenario: An unowned high-ownership hauler is a large loss
    Given a fixture for team 1 is in progress
    And you do not own player 20 who is owned by 80% of the field and has scored 12 live points
    When I compute the live battle
    Then player 20 should be in the losses column
    And player 20 should have a negative rank impact

  Scenario: An owned differential outweighs an owned template player
    Given a fixture for team 1 is in progress
    And you own player 10 owned by 5% of the field who has scored 10 live points
    And you own player 30 owned by 90% of the field who has scored 10 live points
    When I compute the live battle
    Then player 10 should rank above player 30 in the gains column

  Scenario: A player not in a live fixture is excluded
    Given a fixture for team 1 is in progress
    And team 2 has no fixture in progress
    And you own player 40 on team 2 who has scored 12 live points
    When I compute the live battle
    Then player 40 should not appear in the live battle

  Scenario: No in-progress fixtures means the battle is not live
    Given no fixtures are in progress
    When I compute the live battle
    Then the live battle should not be live
    And the gains and losses columns should be empty

  Scenario: Each battle row exposes the player's live points for the PTS column
    Given a fixture for team 1 is in progress
    And you own player 10 who is owned by 5% of the field and has scored 12 live points
    When I compute the live battle
    Then player 10 should report 12 live points
