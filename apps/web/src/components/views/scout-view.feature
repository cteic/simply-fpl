Feature: Scout inbox view

  The scout view renders Frank's derived events as inbox rows: a severity
  tone, a kind chip, a headline naming the player, and a data meta line.

  Scenario: An injury event renders a bad-tone row with an injury chip
    Given an injury scout event for Isak
    When the row model is built
    Then the row has tone "bad" and the injury chip
    And the title names Isak

  Scenario: A doubt event carries chance of playing and news in the meta
    Given a doubt scout event for Palmer with a 50% chance and news text
    When the row model is built
    Then the meta line includes the chance of playing and the news text

  Scenario: A price fall event carries probability and net transfers
    Given a price fall scout event for Mbeumo with 87% probability
    When the row model is built
    Then the row has tone "warn" and the title says a fall is predicted
    And the meta line includes the probability and signed net transfers

  Scenario: A price rise event renders a good-tone row
    Given a price rise scout event for Gordon
    When the row model is built
    Then the row has tone "good" and the price rise chip
