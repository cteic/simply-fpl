Feature: Generic /fpl/* passthrough preserves the query string

  The /fpl/* passthrough must forward the request's query string to FPL and
  include it in the KV cache key. Without this, paginated endpoints like
  /leagues-classic/:id/standings/?page_standings=N collapse onto a single
  cached page-1 response, so the scrape tooling can never reach pages 2..N.

  Scenario: paginated league standings hit upstream with the requested page
    Given the FPL origin is "https://fantasy.premierleague.com/api"
    When the worker builds a passthrough target for path "/leagues-classic/314/standings/" and search "?page_standings=5"
    Then the upstream URL is "https://fantasy.premierleague.com/api/leagues-classic/314/standings/?page_standings=5"
    And the cache key is "fpl:/leagues-classic/314/standings/?page_standings=5"

  Scenario: different query strings get different cache keys
    Given the FPL origin is "https://fantasy.premierleague.com/api"
    When the worker builds passthrough targets for "/leagues-classic/314/standings/" with searches "?page_standings=1" and "?page_standings=5"
    Then the two cache keys are different

  Scenario: requests without a query string still work
    Given the FPL origin is "https://fantasy.premierleague.com/api"
    When the worker builds a passthrough target for path "/bootstrap-static/" and search ""
    Then the upstream URL is "https://fantasy.premierleague.com/api/bootstrap-static/"
    And the cache key is "fpl:/bootstrap-static/"
