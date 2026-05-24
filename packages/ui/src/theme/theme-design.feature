Feature: Per-theme design language

  Each theme resolves to a complete, distinct design specification — not just a
  palette swap. The hero treatment, stat-tile layout, pitch header, and hero
  number weight differ per theme.

  Scenario: Stadium is a floodlit, vibrant design
    When the design for the "stadium" theme is resolved
    Then the hero variant is "floodlit"
    And the stat-tile variant is "accent"
    And the pitch header variant is "gradient"
    And the pitch uses a grass surface

  Scenario: Bold is a dark broadcast, high-contrast design
    When the design for the "bold" theme is resolved
    Then the hero variant is "broadcast"
    And the stat-tile variant is "grid"
    And the pitch header variant is "border"
    And the pitch does not use a grass surface

  Scenario: Quiet is a Swiss-minimal design with a bare hero
    When the design for the "quiet" theme is resolved
    Then the hero variant is "bare"
    And the stat-tile variant is "hairline"
    And the hero number is the lightest weight
    And the pitch header variant is "border"

  Scenario: The three themes are mutually distinct
    When all three theme designs are resolved
    Then no two themes share the same hero variant
    And no two themes share the same stat-tile variant
