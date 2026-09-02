Feature: League press copy

  buildPressModel and buildPressShareText turn the derived league press into
  the gazette page and a plain-text version for the group chat.

  Scenario: A close title race leads with the chase and a rivalry story
    Given a derived press where the leader is 3 points clear
    When the press model is built
    Then the lede names the chaser and the gap
    And a rivalry story is included

  Scenario: A comfortable lead has no rivalry story
    Given a derived press where the leader is 40 points clear
    When the press model is built
    Then no rivalry story is included

  Scenario: A missing sack watch produces no sack watch story
    Given a derived press without a sack watch
    When the press model is built
    Then no sack watch story is included

  Scenario: The share text carries the top three and the site credit
    Given a derived press where the leader is 3 points clear
    When the share text is built for gameweek 16
    Then it contains the review heading, the top-three standings and the site credit
