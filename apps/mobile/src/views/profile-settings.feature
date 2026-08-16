Feature: Theme and locale settings — mobile profile

  Scenario: Stored theme is read back correctly
    Given a theme store containing "bold"
    When the stored theme is read
    Then the resolved theme is "bold"

  Scenario: Unknown stored value falls back to the default theme
    Given a theme store containing "neon"
    When the stored theme is read
    Then the resolved theme is "stadium"

  Scenario: No stored theme falls back to the default
    Given a fresh theme store
    When the stored theme is read
    Then the resolved theme is "stadium"

  Scenario: Writing a theme persists it in the store
    Given a fresh theme store
    When the user writes the theme "quiet"
    Then the store contains "quiet"

  Scenario: Valid locale code is recognised
    Given the locale code "fr"
    When the code is checked for support
    Then it is a supported locale

  Scenario: Unknown locale code is rejected
    Given the locale code "xx"
    When the code is checked for support
    Then it is not a supported locale
