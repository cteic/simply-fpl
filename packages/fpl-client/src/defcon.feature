Feature: DefCon progress computation

  Scenario: DEF with CBIT below threshold shows in-progress bar
    Given a defender with 8 clearances-blocks-interceptions and 0 tackles
    When I compute DefCon progress
    Then the progress is eligible
    And the current is 8 and threshold is 10
    And the percentage is 80
    And awarded is false

  Scenario: DEF reaching the threshold is awarded
    Given a defender with 7 clearances-blocks-interceptions and 4 tackles
    When I compute DefCon progress
    Then the progress is eligible
    And the current is 11 and threshold is 10
    And the percentage is 100
    And awarded is true

  Scenario: MID has a higher threshold of 12
    Given a midfielder with 10 clearances-blocks-interceptions and 1 tackle
    When I compute DefCon progress
    Then the progress is eligible
    And the current is 11 and threshold is 12
    And awarded is false

  Scenario: GK is not eligible for DefCon
    Given a goalkeeper with 5 clearances-blocks-interceptions and 2 tackles
    When I compute DefCon progress
    Then the progress is not eligible

  Scenario: FWD is not eligible for DefCon
    Given a forward with 3 clearances-blocks-interceptions and 5 tackles
    When I compute DefCon progress
    Then the progress is not eligible

  Scenario: CBIT not yet logged returns zero progress
    Given a defender with 0 clearances-blocks-interceptions and 0 tackles
    When I compute DefCon progress
    Then the progress is eligible
    And the current is 0 and threshold is 10
    And the percentage is 0
    And awarded is false
