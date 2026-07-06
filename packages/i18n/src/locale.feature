Feature: Locale infrastructure

  Scenario: English is returned when no locale is set
    Given no locale preference is stored
    When I translate "common.loading" with no locale argument
    Then the result is "Loading…"

  Scenario: French translation is returned for a known key
    Given the "fr" locale is loaded and set
    When I translate "common.loading"
    Then the result is "Chargement…"

  Scenario: German translation is returned for a known key
    Given the "de" locale is loaded and set
    When I translate "common.loading"
    Then the result is "Laden…"

  Scenario: Spanish translation is returned for a known key
    Given the "es" locale is loaded and set
    When I translate "common.loading"
    Then the result is "Cargando…"

  Scenario: Missing key in a locale falls back to English
    Given the "fr" locale is loaded and set
    When I translate a key that exists only in English
    Then the English value is returned

  Scenario: Interpolation variables are substituted in translated strings
    Given the "fr" locale is loaded and set
    When I translate "rivals.not_in_league" with entryId "42"
    Then the result contains "42"

  Scenario: Accept-Language header selects a supported locale
    Given an Accept-Language header of "fr-FR,fr;q=0.9,en;q=0.8"
    When the locale is detected from the header
    Then the detected locale is "fr"

  Scenario: Accept-Language header falls back to English for unsupported locale
    Given an Accept-Language header of "ja,zh;q=0.9"
    When the locale is detected from the header
    Then the detected locale is "en"

  Scenario: Stored locale overrides Accept-Language
    Given the locale "de" is stored
    When I read the stored locale
    Then the locale is "de"

  Scenario: Unknown stored value falls back to English
    Given an unknown locale "xx" is stored
    When I read the stored locale
    Then the locale is "en"
