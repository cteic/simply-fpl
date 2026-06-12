Feature: Analytics utilities

  Scenario: sanitizePath strips a single numeric segment
    Given a path "/rivals/12345"
    When sanitizePath is called
    Then the result is "/rivals/:id"

  Scenario: sanitizePath strips multiple numeric segments
    Given a path "/h2h/99/vs/101"
    When sanitizePath is called
    Then the result is "/h2h/:id/vs/:id"

  Scenario: sanitizePath leaves non-numeric segments unchanged
    Given a path "/leagues/top"
    When sanitizePath is called
    Then the result is "/leagues/top"

  Scenario: hashUserId is deterministic
    Given salt "test-salt" and user ID "550e8400-e29b-41d4-a716-446655440000"
    When hashUserId is called twice with the same inputs
    Then both results are identical

  Scenario: hashUserId does not expose raw user ID fragments
    Given salt "test-salt" and user ID "550e8400-e29b-41d4-a716-446655440000"
    When hashUserId is called
    Then the result does not contain "550e8400"
    And the result does not contain "446655440000"
