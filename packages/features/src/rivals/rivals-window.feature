Feature: Rivals window size helpers

  Scenario: Window size 5 maps to 2 above and 2 below
    Given a window size of 5
    When I convert it to select options
    Then the above count should be 2
    And the below count should be 2

  Scenario: Window size 3 maps to 1 above and 1 below
    Given a window size of 3
    When I convert it to select options
    Then the above count should be 1
    And the below count should be 1

  Scenario: Window size 10 maps to 4 above and 5 below
    Given a window size of 10
    When I convert it to select options
    Then the above count should be 4
    And the below count should be 5

  Scenario: Reading an absent key returns the default window size
    Given no window size has been saved for user "u1"
    When I read the window size for user "u1"
    Then the result should be 5

  Scenario: A saved window size is preserved on read
    Given a window size of 10 has been saved for user "u1"
    When I read the window size for user "u1"
    Then the result should be 10
