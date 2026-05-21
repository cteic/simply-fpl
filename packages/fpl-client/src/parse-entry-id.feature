Feature: Parse FPL entry id from user input

  Scenario: Bare numeric team id
    Given the input "1234567"
    When I parse the entry id
    Then the result should be 1234567

  Scenario: Pasted FPL team URL
    Given the input "https://fantasy.premierleague.com/entry/987654/event/30"
    When I parse the entry id
    Then the result should be 987654

  Scenario: Input with surrounding whitespace
    Given the input "  42  "
    When I parse the entry id
    Then the result should be 42

  Scenario: Non-numeric rubbish
    Given the input "not-a-team"
    When I parse the entry id
    Then the result should be null

  Scenario: Zero is rejected
    Given the input "0"
    When I parse the entry id
    Then the result should be null

  Scenario: Empty input
    Given the input ""
    When I parse the entry id
    Then the result should be null
