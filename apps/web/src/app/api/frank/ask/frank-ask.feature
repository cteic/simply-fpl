Feature: Frank on-demand ask quota and streaming

  The ask route reserves a quota row before calling the AI service so that
  concurrent requests can never spend past the monthly hard cap. Live responses
  are streamed via SSE; cache hits return JSON instantly without streaming.

  Scenario: a user under quota gets an answer and the reservation stores the response
    Given a signed-in Ultimate user with 0 queries this month
    When they ask Frank a question
    Then the response is a stream
    And the stream contains a done event with Frank's advice
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
    Then the response is a stream
    And the stream contains an error event
    And no query rows remain for the user

  Scenario: a cached answer is returned as JSON without an AI call
    Given a signed-in Ultimate user with 0 queries this month
    And the ask-cache has a stored answer for the question
    When they ask Frank a question
    Then the response is JSON
    And no AI call is made

  Scenario: a cache miss triggers a streaming response
    Given a signed-in Ultimate user with 0 queries this month
    And the ask-cache has no stored answer
    When they ask Frank a question
    Then the response is a stream
    And the stream contains a done event with Frank's advice
    And exactly one AI call is made

  Scenario: an answer that cannot be parsed is not written to the shared cache
    Given a signed-in Ultimate user with 0 queries this month
    And the model replies with text that is not JSON
    When they ask Frank a question
    Then the ask-cache is never written

  Scenario: a client that disconnects mid-stream keeps its quota reservation
    Given a signed-in Ultimate user with 0 queries this month
    When they ask Frank a question and close the stream straight away
    Then the reservation stays and records the token usage

  Scenario: the daily budget ends up holding what the answer really cost
    Given a signed-in Ultimate user with 0 queries this month
    When they ask Frank a question
    Then the daily budget holds the tokens the answer used

  Scenario: a request the daily budget cannot cover makes no AI call
    Given a signed-in Ultimate user with 0 queries this month
    And the daily token budget is nearly spent
    When they ask Frank a question
    Then no AI call is made
    And the reply says the daily budget is reached
    And no quota row is left behind

  Scenario: concurrent asks cannot spend past the daily budget
    Given a signed-in Ultimate user with 0 queries this month
    And the daily token budget has room for exactly one question
    When they ask Frank two questions concurrently
    Then exactly one AI call is made

  Scenario: an AI failure hands the daily reservation back
    Given a signed-in Ultimate user with 0 queries this month
    And the AI service is failing
    When they ask Frank a question
    Then the daily budget holds nothing

  Scenario: Frank still answers when the budget function is not deployed
    Given a signed-in Ultimate user with 0 queries this month
    And the budget function is unavailable
    When they ask Frank a question
    Then exactly one AI call is made

