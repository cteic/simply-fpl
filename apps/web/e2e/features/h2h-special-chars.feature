Feature: /h2h hydrates without JS errors when manager names contain special chars

  Regression for #194. The page must hydrate cleanly when the data it renders
  contains an apostrophe, an umlaut, or a literal "</script>" sequence — none
  of those should leak through the SSR pipeline and break the JS parser.

  Background:
    Given the Worker returns fixtures for two managers with special characters

  Scenario: /h2h/<a>/<b> renders without any pageerror
    When I open "/h2h/1001/1002"
    Then no head-to-head page error should have occurred
    And the head-to-head page renders the manager names
