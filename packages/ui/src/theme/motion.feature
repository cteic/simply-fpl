Feature: Motion tokens and value-pulse gating

  The motion module is the single vocabulary for animation timing and easing,
  and decides when a data-driven pulse (e.g. a StatTile receiving a new value)
  is allowed to play. Pulses only fire on a real value change, never on first
  paint, and never when the user prefers reduced motion.

  Scenario: A changed value pulses
    Given the previous pulse key is "1204567"
    And reduced motion is off
    When the next pulse key is "1198432"
    Then the pulse plays

  Scenario: First paint never pulses
    Given there is no previous pulse key
    And reduced motion is off
    When the next pulse key is "1198432"
    Then the pulse does not play

  Scenario: An unchanged value does not pulse
    Given the previous pulse key is "1198432"
    And reduced motion is off
    When the next pulse key is "1198432"
    Then the pulse does not play

  Scenario: Reduced motion suppresses the pulse
    Given the previous pulse key is "1204567"
    And reduced motion is on
    When the next pulse key is "1198432"
    Then the pulse does not play

  Scenario: Clearing a value does not pulse
    Given the previous pulse key is "1204567"
    And reduced motion is off
    When the next pulse key is missing
    Then the pulse does not play

  Scenario: Durations mirror the Tamagui animation config
    When the motion durations are read
    Then fast is 120ms, medium is 250ms, slow is 350ms and bar is 1200ms
