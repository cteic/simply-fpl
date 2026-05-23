Feature: Theme preference

  Scenario: Switching theme persists the choice across reloads
    Given a fresh theme store
    When the user selects the "bold" theme
    Then a reload reads back the "bold" theme

  Scenario: An unknown stored value falls back to Stadium
    Given a theme store containing the value "neon"
    When the persisted theme is read
    Then the resolved theme is "stadium"

  Scenario: With no stored preference the default is Stadium
    Given a fresh theme store
    When the persisted theme is read
    Then the resolved theme is "stadium"
