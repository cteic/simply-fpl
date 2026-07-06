Feature: Frank on-demand question cache

  The worker stores on-demand Frank answers in FRANK_WEEKLY_CACHE under
  "frank:ask:*" keys with a 24-hour TTL. GET returns the cached payload or 404;
  PUT requires the X-Frank-Cache-Secret header and stores the payload.

  Scenario: GET with a cached key returns the stored payload
    Given the FRANK_WEEKLY_CACHE holds a cached ask response under key "frank:ask:abc:def"
    When a GET request is made for key "frank:ask:abc:def"
    Then the response status is 200
    And the response header X-Cache is HIT
    And the response body matches the stored payload

  Scenario: GET for a missing key returns 404
    Given the FRANK_WEEKLY_CACHE is empty
    When a GET request is made for key "frank:ask:abc:def"
    Then the response status is 404
    And the response header X-Cache is MISS

  Scenario: PUT with the correct secret stores the payload
    Given the FRANK_CACHE_WRITE_SECRET is "test-secret"
    And the FRANK_WEEKLY_CACHE is empty
    When a PUT request is made with the correct secret and a JSON payload
    Then the response status is 200
    And the FRANK_WEEKLY_CACHE contains the stored payload under the given key

  Scenario: PUT with an incorrect secret is rejected
    Given the FRANK_CACHE_WRITE_SECRET is "test-secret"
    When a PUT request is made with an incorrect secret
    Then the response status is 403
