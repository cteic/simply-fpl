Feature: Threats view — mobile

  Scenario: Status filter narrows the threats list
    Given threats with playing statuses "played", "playing", and "to-play"
    When the status filter is set to "played"
    Then only the threat with status "played" is visible

  Scenario: All filter shows every threat
    Given threats with playing statuses "played" and "playing"
    When the status filter is set to "all"
    Then both threats are visible

  Scenario: Empty result when no threats match the active filter
    Given threats with playing status "played"
    When the status filter is set to "playing"
    Then the visible threats list is empty
