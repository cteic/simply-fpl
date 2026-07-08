Feature: /vs/timed-fetch — live byte-timing endpoint

  A rate-limited endpoint that measures network response time for SimplyFPL
  and livefpl.net from the Cloudflare edge. Results feed the "test it yourself"
  widget on /vs-livefpl.

  Scenario: Valid request returns timing data
    Given the IP "1.2.3.4" has no prior requests this minute
    When GET /vs/timed-fetch?target=simplyfpl is requested from that IP
    Then the response is 200 with durationMs and bytesReceived

  Scenario: Rate limit enforced after 30 requests per minute
    Given the IP "1.2.3.4" has already made 30 requests this minute
    When GET /vs/timed-fetch?target=simplyfpl is requested from that IP
    Then the response is 429 with retryAfterSeconds

  Scenario: Unknown target returns 400
    When GET /vs/timed-fetch?target=unknown is requested
    Then the response is 400

  Scenario: A strict limit-3 window rejects the fourth request
    Given the IP "2.3.4.5" has made 3 requests in a window with limit 3
    When checkRateLimit is called with limit 3 for IP "2.3.4.5"
    Then the check result is not allowed

  Scenario: A looser limit-10 window allows the fourth request
    Given the IP "2.3.4.5" has made 3 requests in a window with limit 10
    When checkRateLimit is called with limit 10 for IP "2.3.4.5"
    Then the check result is allowed
