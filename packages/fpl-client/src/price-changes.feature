Feature: Price change prediction

  Scenario: Format price from FPL tenths notation
    Given a price value of 55 in FPL tenths
    When I format the price
    Then it should display as £5.5m

  Scenario: Format price for a premium player
    Given a price value of 135 in FPL tenths
    When I format the price
    Then it should display as £13.5m

  Scenario: Player with strong net transfers is predicted to rise
    Given a player with 10 percent ownership and 200000 net transfers in this week
    When I predict price changes
    Then that player should be predicted to rise

  Scenario: Player with strong net transfers out is predicted to fall
    Given a player with 20 percent ownership and 400000 net transfers out this week
    When I predict price changes
    Then that player should be predicted to fall

  Scenario: Unavailable player is excluded from predictions
    Given a player with chance of playing set to zero
    When I predict price changes
    Then that player should not appear in the predictions
