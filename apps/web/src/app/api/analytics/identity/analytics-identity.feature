Feature: Analytics identity route

  The identity route hashes the signed-in user's id for analytics. It must
  validate the caller's token with the auth server rather than trusting the
  session cookie.

  Scenario: a signed-in user gets a hashed analytics id from a validated token
    Given a signed-in user
    When the identity route is called
    Then the response contains a hashed id
    And the user was validated with the auth server

  Scenario: an unauthenticated request gets a null id
    Given no signed-in user
    When the identity route is called
    Then the response id is null
