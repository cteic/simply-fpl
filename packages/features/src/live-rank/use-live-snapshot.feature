Feature: Live snapshot WebSocket subscription

  Scenario: A connected client receives a delta within seconds when a player's stats change
    Given a client subscribed to gameweek 39 over WebSocket
    When the server pushes a delta for player 1 with 8 total points
    Then the client's snapshot reflects player 1 at 8 total points

  Scenario: After three failed connections the client falls back to polling
    Given a WebSocket implementation that fails on every connect
    When the client subscribes to gameweek 39
    Then after three failures the client falls back to HTTP polling
