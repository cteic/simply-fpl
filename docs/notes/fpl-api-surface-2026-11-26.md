# What the FPL API actually gives us, measured 2026-11-26

Probed live against `fantasy.premierleague.com/api` on 2026-11-26, between
GW11 (settled) and GW12 (deadline 2026-11-27 18:30 UTC). The endpoint list
below is not guesswork: it is every path string in FPL's own web bundle
(`/assets/index-ji_yiPlV.js`), so it is the full surface their front end uses.

## Headline: there is no live rank endpoint, and there never was one

FPL publishes live **points**. It does not publish live **rank**.

Their own UI proves it. The points status machine is
`Not started -> Live -> Provisional -> Confirmed`, with this tooltip:

> Points and bonus update live during matches. A day becomes Provisional once
> every match finishes, then Confirmed after official data is checked.

Rank is separate and lags. When `event-status.leagues == "Updating"` the UI
shows "League tables and autosubs are updating..." and afterwards "League
tables have been updated!". The string "live rank" appears nowhere in their
bundle. "Overall rank" renders from `entry.summary_overall_rank`, which is the
settled value.

Every plausible live-rank route 404s: `entry/{id}/live/`,
`entry/{id}/event/{gw}/live/`, `event/{gw}/ranks/`, `event/{gw}/standings/`,
`event/{gw}/percentiles/`, `live-rank/{id}/`, `entry/{id}/rank/`, `ranks/`,
`v2/bootstrap-static/`.

So estimating live rank stays our job. That is why the estimator being wrong
matters.

## But there is a much better way to estimate it

`leagues-classic/314/standings/?page_standings=N` is the global league. It
pages 50 entries deep through the whole field and it is **monotonic and
exact**: each page gives real ranks against real total points.

| page    | rank                  | total points |
| ------- | --------------------- | ------------ |
| 1       | 1                     | 855          |
| 1,000   | 49,929                | 748          |
| 50,000  | 2,491,458             | 643          |
| 150,000 | 7,498,198             | 541          |
| 226,000 | (empty, end of field) |              |

Sampling pages logarithmically builds the real points-to-rank curve for all
11.3M entries. Measured against 20 held-out pages the sampler never saw:

| curve                 | requests | median abs error | worst     | top-1k case |
| --------------------- | -------- | ---------------- | --------- | ----------- |
| sparse                | 24       | 1.17%            | 166.78%   | 166.78%     |
| **denser at the top** | **42**   | **1.17%**        | **9.54%** | **5.03%**   |

Against the models we have measured on the replay archive:

| estimator                                       | median abs error |
| ----------------------------------------------- | ---------------- |
| **points-to-rank curve (42 requests)**          | **1.17%**        |
| flat-700 `estimateLiveRank`                     | 12.60%           |
| distribution `estimateLiveRankSmart` (shipping) | 148.80%          |

Spot check: entry 219895 has 606 points and FPL reports
`overall_rank: 4,362,395`. The curve says 4,349,861, an error of 12,534
places, 0.29%.

This is not a better model. It is FPL's own data, so it removes the modelling
problem rather than improving it. 42 requests per gameweek, cached in KV, is
the whole cost. The live estimate becomes: look up the manager's live total in
the curve, then shift for how much the field has scored so far this gameweek.

The curve is settled data, refreshed once per gameweek after
`event-status.leagues` flips to `Updated`, so it never needs live polling and
never touches the LiveGwDO fan-out.

## New rank fields we were not reading

| field                     | where                    | GW11 value for entry 219895 |
| ------------------------- | ------------------------ | --------------------------- |
| `percentile_rank`         | entry history row, picks | 90                          |
| `overall_rank_percentage` | entry history row, picks | `"39"`                      |
| `ranked_count`            | `bootstrap.events[]`     | 11,261,396                  |
| `rank_percentage`         | `history.past[]`         | `"27"`                      |

Both percentage fields are derived, not new information:

- `percentile_rank` is the **gameweek** rank as a percentile, rounded up to
  the next band in `game_config.rules.percentile_ranks` =
  `[1,5,10,...,95]`. GW11: 9,743,212 / 11,261,396 = 86.5% -> band 90.
  One band spans about 560,000 ranks.
- `overall_rank_percentage` is the **overall** rank as a whole-number percent
  of `ranked_count`. GW11: 4,362,395 / 11,261,396 = 38.7% -> `"39"`.
  One percent is about 113,000 ranks.

`ranked_count` is the correct denominator and is 0 for an unstarted gameweek,
so during a live gameweek the last settled value is the one to use.
`total_players` (11,332,858) counts registrations and is 71,462 higher.

Whether these fields populate mid-gameweek is still unverified: GW11 is
`finished: true, data_checked: true`. GW12 is the next window.

Note `is_current` stays on the last **completed** gameweek until the next
deadline passes. Right now GW11 is `is_current: true` while also finished and
data-checked, and GW12 is `is_next`. Anything keyed on `is_current` alone to
mean "in progress" is wrong for most of the week.

## FPL now ships its own price predictor

This is the biggest find. `bootstrap-static.elements[]` carries:

| field                       | type               | example (Wirtz)          |
| --------------------------- | ------------------ | ------------------------ |
| `price_change_percent`      | string             | `"102.1"`                |
| `price_change_hourly_rate`  | number             | `10958`                  |
| `price_change_projections`  | array of 3         | offsets 0/1/2 days ahead |
| `price_change_locked_until` | ISO string or null | `null`                   |
| `price_change_calibrating`  | boolean            | `false`                  |

Each projection is `{offset, projected_percent, likelihood}` with `likelihood`
on a -5 to +5 scale. Wirtz: `123.4%` today, `200.2%` tomorrow, `277.0%` in two
days, likelihood +5 throughout.

There is also `stats/price-changes/`, the official change log:
`{element, team, event, changed_at, cost_before, cost_after}`, 405 records so
far this season. That is free ground truth for validating any predictor.

### Our predictor is noise

`packages/fpl-client/src/price-changes.ts` says in a comment "FPL doesn't
publish exact algo". That is no longer true. Measured against FPL's own
figures on the same bootstrap payload:

|                                     | ours | FPL               |
| ----------------------------------- | ---- | ----------------- |
| players flagged as changing         | 290  | 6 at or over 100% |
| flagged at 100% certainty           | 183  | 6                 |
| of our 183, ones FPL agrees are due | 3    |                   |

The official log shows 1 to 19 changes a night, typically 3 to 6. FPL's count
of 6 matches that base rate. Ours claims 183 certainties, about 30x too many.

Two bugs cause it:

1. `probability = min((netRatio - 0.01) / 0.01, 1)` saturates at a net ratio of
   0.02, so 183 of 290 rows (63%) pin to exactly 1.0. That is the "all Prices
   rows show 100%" defect.
2. `totalManagers = 10_000_000` is hardcoded. The real figure is 11,332,858,
   a 13% error in every ownership base. `bootstrap.total_players` has it.

Direction is wrong too, not just magnitude. We call Bruno G. a 100% certain
**fall**; FPL has him at +24.8% and rising, likelihood +2. Same for Lindelöf:
we say certain fall, FPL says +21.8% rising.

## Other endpoints we have never used

Complete list from their bundle, with live status. 403 means it needs a logged-in session.

| endpoint                              | status | what it gives                                                                       |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| `entry/{id}/event/{gw}/new-picks/`    | 200    | **picks + live stats + teams + fixtures in one call**, 57 KB vs 1.8 KB for `picks/` |
| `stats/price-changes/`                | 200    | official price change log                                                           |
| `fixture/{id}/stats/`                 | 200    | per-fixture player stats                                                            |
| `dream-team/{gw}/`                    | 200    | gameweek dream team                                                                 |
| `league/{id}/entries/`                | 200    | league members without standings                                                    |
| `league/{id}/cup-status/`             | 200    | cup qualification state                                                             |
| `stats/best-classic-private-leagues/` | 200    | biggest public leagues                                                              |
| `stats/most-valuable-teams/`          | 200    | highest squad values                                                                |
| `winners/event/{gw}/`                 | 200    | gameweek winners                                                                    |
| `regions/`                            | 200    | country list                                                                        |
| `team/set-piece-notes/`               | 200    | set piece takers                                                                    |
| `community-wall/`                     | 200    | user-submitted crest images                                                         |
| `element-summary/{id}/`               | 200    | per-player fixtures, history, 4 past seasons                                        |
| `entry/{id}/transfers-latest/`        | 403    | session required                                                                    |
| `watchlist/{id}/`                     | 403    | session required                                                                    |
| `leagues-renewable/`                  | 403    | session required                                                                    |
| `my-team/{id}/`                       | 403    | session required                                                                    |
| `fixtures/fdr`                        | 404    | in the bundle, not served                                                           |

`new-picks/` is worth a look on its own. It replaces four of our calls with
one: `picks`, `event/{gw}/live/`, the elements slice of bootstrap, and the
fixtures for those players. Its `live_elements` carries the full per-player
`explain` and `stats` blocks, including `can_auto_sub_in` / `can_auto_sub_out`
and `points_modification`, scoped to that entry's 15 players. The whole-field
`event/{gw}/live/` is 481 KB; this is 57 KB.

## Fields we model but could use better

- `fixtures[].finished_provisional` is in our `FplFixture` type. FPL uses it to
  drive the Provisional vs Confirmed badge. `provisional_start_time` and
  `minutes` are not modelled.
- `elements[].scout_risks` is an array of
  `{property, notes, gameweek, url}` covering `suspension_risk` (on 4 yellows)
  and `loan_ineligible` (cannot face parent club in a named gameweek).
  `scout_news_link` goes with it.
- `bootstrap.chips` now carries `chip_type` (`transfer` or `team`) and splits
  into two halves, events 1-19 and 20-38, which is the two-chip-sets rule.
- `game_config.rules.max_extra_free_transfers` is 4, so free transfers bank up
  to 5.
- `bootstrap.contests` is new and empty. Worth watching.
- `leagues-classic/{id}/standings/` returns `last_updated_data`, which tells us
  when standings were recomputed instead of guessing.

## What this changes

1. The price predictor is a headline feature and it is noise. The fix is to
   read fields that already exist, and the official log validates it.
2. Live rank should come from the real points-to-rank curve, not a model. 42
   cached requests a gameweek beats both current estimators by 10x or more.
3. `percentile_rank` is a useful calibration check: an estimate outside FPL's
   own band is wrong by FPL's reckoning.
4. `new-picks/` collapses four calls into one for the single-entry view.

## Evidence

The two files behind the error table are committed:

- `docs/notes/data/gw11-points-to-rank-curve.tsv` the 42 sampled pages
- `docs/notes/data/gw11-points-to-rank-holdout.tsv` the 20 held-out pages

Both are GW11 settled data. Re-sample per gameweek; the shape moves as the
field's totals grow.
