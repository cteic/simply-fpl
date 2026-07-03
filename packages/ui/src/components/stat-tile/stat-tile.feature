Feature: Stat tile vibrant-stadium tone tokens

  The dashboard stat tiles (GW Points, Total Points, On Bench, Captain, ...)
  render on the vibrant-stadium look rather than flat black-on-white. Each tile
  maps a semantic tone to a tokenised surface tint plus an accent left border,
  so the palette stays in the design tokens with no bespoke hex. These scenarios
  lock that mapping.

  Scenario: Positive tiles get the positive tint and accent
    When the tile tone is "positive"
    Then the tile surface is "$positiveBg"
    And the tile accent border is "$positive"

  Scenario: Brand tiles get the brand tint and accent
    When the tile tone is "brand"
    Then the tile surface is "$brandBg"
    And the tile accent border is "$brand"

  Scenario: Warning tiles get the warning tint and accent
    When the tile tone is "warning"
    Then the tile surface is "$warningBg"
    And the tile accent border is "$warning"

  Scenario: Neutral tiles stay on surface with a strong border
    When the tile tone is "neutral"
    Then the tile surface is "$surface"
    And the tile accent border is "$borderStrong"

  Scenario: Negative tiles stay on surface to avoid reading as an error
    When the tile tone is "negative"
    Then the tile surface is "$surface"
    And the tile accent border is "$negative"

  Scenario: Every tile uses tokenised colours only
    When every tile tone is mapped
    Then no mapped colour is a bespoke hex value
