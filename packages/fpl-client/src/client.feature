Feature: FPL proxy client

  Scenario: Fetch bootstrap static data via Worker proxy
    Given the Worker proxy is returning bootstrap static data
    When I call getBootstrapStatic
    Then I receive a response containing events and elements

  Scenario: Fetch live gameweek data via Worker proxy
    Given the Worker proxy is returning live gameweek data for event 1
    When I call getLiveGameweek for event 1
    Then I receive live element scores

  Scenario: Fetch manager entry via Worker proxy
    Given the Worker proxy is returning entry data for manager 12345
    When I call getEntry for manager 12345
    Then I receive the manager name and overall rank

  Scenario: Failed request throws a descriptive error
    Given the Worker proxy returns a 500 error
    When I call getBootstrapStatic and it fails
    Then an error containing the status code is thrown
