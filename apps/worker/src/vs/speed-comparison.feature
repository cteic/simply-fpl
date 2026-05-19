Feature: Speed-comparison cron

  Once a week the Worker measures SimplyFPL and livefpl.net via Browser
  Rendering and stores the result in R2 so the marketing page can read it.

  Scenario: Successful weekly run writes both latest and dated snapshots
    Given Browser Rendering returns sensible metrics for both sites
    When the speed-comparison cron fires on 2026-05-18
    Then R2 contains vs/comparison.json
    And R2 contains vs/2026-W21/comparison.json
    And R2 contains screenshots for both sites under vs/2026-W21/

  Scenario: A failing site preserves the previous snapshot and writes last-error
    Given Browser Rendering fails for livefpl
    When the speed-comparison cron fires on 2026-05-18
    Then R2 contains vs/last-error.json
    And R2 does not overwrite vs/comparison.json
