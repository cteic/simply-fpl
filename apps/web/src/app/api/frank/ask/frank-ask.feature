Feature: Frank on-demand ask quota

  The ask route reserves a quota row before calling the AI service so that
  concurrent requests can never spend past the monthly hard cap.

  Scenario: a user under quota gets an answer and the reservation stores the response
    Given a signed-in Ultimate user with 0 queries this month
    When they ask Frank a question
    Then the response contains Frank's advice
    And exactly one AI call is made
    And the stored query row contains the response

  Scenario: a user at the hard cap is rejected without an AI call
    Given a signed-in Ultimate user with 80 queries this month
    When they ask Frank a question
    Then the response status is 429
    And no AI call is made

  Scenario: concurrent asks at the quota boundary never spend past the hard cap
    Given a signed-in Ultimate user with 79 queries this month
    When they ask Frank two questions concurrently
    Then at most one AI call is made
    And at least one response status is 429

  Scenario: an AI service failure releases the quota reservation
    Given a signed-in Ultimate user with 0 queries this month
    And the AI service is failing
    When they ask Frank a question
    Then the response status is 503
    And no query rows remain for the user
