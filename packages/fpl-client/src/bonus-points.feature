Feature: Live bonus point prediction

  Scenario: BPS ties at third place share the bonus
    Given an in-play fixture with bps values 30, 20, 10, 10
    When I predict bonus points for the fixture
    Then the top player gets 3 predicted bonus
    And the second player gets 2 predicted bonus
    And both third-place players get 1 predicted bonus

  Scenario: Players with zero bps receive no bonus
    Given an in-play fixture with bps values 25, 0, 0
    When I predict bonus points for the fixture
    Then only the top player receives predicted bonus
    And the zero-bps players receive no bonus

  Scenario: A fixture that has not started produces no bonus
    Given an unstarted fixture with no live data
    When I predict bonus points for the fixture
    Then no element has a bonus entry

  Scenario: A finished fixture returns official bonus marked non-provisional
    Given a finished fixture with official bonus values
    When I predict bonus points for the fixture
    Then the result uses the official bonus values
    And the entries are marked non-provisional
