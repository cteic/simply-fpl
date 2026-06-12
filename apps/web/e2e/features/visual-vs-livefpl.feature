Feature: vs-livefpl visual regression

  Visual guardrail for /vs-livefpl (speed comparison page). The backend shipped
  in PR #198 (feat/speed-comparison-backend) but the user-facing /vs-livefpl
  page is not on dev yet — the scenario below is marked @fixme until the route
  exists, at which point removing the tag and running with --update-snapshots
  produces the gate.

  Background:
    Given the Worker returns deterministic FPL fixtures
    And the Worker returns deterministic vs-livefpl speed comparison data

  Scenario: vs-livefpl page renders with stub speed data
    Given no team is saved in storage
    When I visit the vs-livefpl page
    Then no page error should have occurred
    And the rendered page matches the snapshot "vs-livefpl-with-stub-data"
