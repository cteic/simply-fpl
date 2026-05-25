Feature: Live Battle PTS column and autosubs toggle

  The live-rank dashboard surfaces the Live Battle gains/losses table with a
  PTS value per player and per-column totals, an explicit Pre/Post autosubs
  toggle folded into the hero, and a provisional-bonus note. The battle panel
  must also stack cleanly on a phone viewport without overlap.

  Background:
    Given the Worker returns deterministic live-battle fixtures

  Scenario: Live Battle shows PTS values and per-column totals
    When I visit the live-battle dashboard
    Then no live-battle page error should have occurred
    And the Live Battle panel shows the PTS column header
    And the Live Battle panel shows a per-column Total and an overall Net

  Scenario: The autosubs toggle switches GW points between pre and post subs
    When I visit the live-battle dashboard
    Then the autosubs toggle is visible
    And switching to Post subs changes the displayed GW points

  Scenario: The provisional bonus note is shown when bonus is provisional
    When I visit the live-battle dashboard
    Then the provisional bonus note is visible

  Scenario: Live Battle columns stack without overlap on a phone
    When I visit the live-battle dashboard on a phone
    Then no live-battle page error should have occurred
    And the Live Battle gains and losses columns do not overlap
