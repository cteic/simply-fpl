# FPL's own rank fields, and what they mean for ours

Measured 2026-11-26, between GW11 (finished) and GW12 (deadline
2026-11-27T18:30Z).

## What FPL now returns that we do not read

Three fields exist in the live API that our types did not model and no code
consumed.

| Field                     | Endpoint                                     | GW11 value for entry 219895 |
| ------------------------- | -------------------------------------------- | --------------------------- |
| `percentile_rank`         | `/entry/{id}/history/`, `/event/{gw}/picks/` | `90`                        |
| `overall_rank_percentage` | same                                         | `"39"`                      |
| `ranked_count`            | `bootstrap-static` events[]                  | `11261396`                  |

`percentile_rank` is a band, not a number. The bands come from
`game_config.rules.percentile_ranks`, which is
`[1,5,10,15,...,90,95]`. So the finest resolution FPL offers is 5 percentage
points, which at 11.3M entries is a span of about 560,000 ranks.

`past[]` carries the same idea for whole seasons as `rank_percentage`.

## Does it update live?

Unverified, and only answerable from inside a live gameweek. GW11 is
`finished: true, data_checked: true`, so every field above is settled and will
not move until GW12 kicks off.

Two things point at yes. A 5-point band is useless once the exact rank is
known, which it already is for a settled gameweek, so a band is only worth
computing while exact rank is unavailable. And the bands are published in
`game_config`, which is how FPL ships client-side display rules.

`scripts/measure-live-percentile.mjs` settles it with data. Run it during GW12
and it appends one JSONL row per entry per poll to
`var/live-percentile/<season>-gw<NN>.jsonl`:

```
node scripts/measure-live-percentile.mjs --entries=219895,4173513 --interval=120
```

GW12 is the next window. After it the gameweek settles and the question waits
two more weeks.

## What this changes for our estimate

If FPL ships a live band, our exact figure is still the differentiator: a
number beats "somewhere in the top 35% to 40%". But it only beats it while it
is right, and the offline replay says the shipping flat model is not.

`node scripts/measure-rank-accuracy.mjs` over the committed 2025-26 archive,
2,294 scored pairs:

| true-rank band | n   | median abs error | median abs % |
| -------------- | --- | ---------------- | ------------ |
| 1-10k          | 12  | 4,764            | 99.9%        |
| 10k-100k       | 77  | 13,547           | 25.7%        |
| 100k-500k      | 423 | 52,000           | 21.3%        |
| 500k-1M        | 347 | 124,244          | 17.3%        |
| 1M-3M          | 728 | 235,558          | 12.7%        |
| 3M+            | 707 | 356,032          | 7.2%         |

Overall median absolute error is 12.6%. The top band is essentially 100%
wrong.

Two caveats on that table. It replays `estimateLiveRank`, the flat
700-places-per-point model, not `estimateLiveRankSmart`, which is what
actually ships. So these numbers are the floor we improved on, not a
measurement of the current app. Closing that gap means teaching
`replay-archive.ts` to score the smart estimator, which needs per-sample
bootstrap and distribution inputs.

Also, `percentile_rank` is a free calibration signal. During a live gameweek it
gives a band our exact estimate should sit inside. An estimate that falls
outside FPL's own band is wrong by FPL's own reckoning, which is a cheap
correctness check we do not currently run.

## Fixed here

The rank denominator was the constant `APPROX_TOTAL_FPL_ENTRIES = 11_000_000`.
FPL reports `ranked_count: 11_261_396` on the current event, so every estimate
was scaled 2.3% low. `getRankedEntryCount()` reads the real figure and falls
back to the constant when FPL omits it.

`computeLiveRankEstimate` also never passed `bootstrap` into
`estimateLiveRankSmart`. Without it the estimator cannot derive the season, so
it treated the captured 2025-26 distribution as same-season and skipped the
mean-shift that anchors a prior-season shape to this season's average. Both the
nav pill and the live-rank page were affected.
