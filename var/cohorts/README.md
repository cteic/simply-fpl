# Cohort score-distribution samples (2025/26)

One-time historical capture of **manager score distributions** per gameweek, used to
calibrate the live-rank estimate so it is accurate from GW1 of the next season.

FPL serves every gameweek's standings + picks only until **~August**, after which the
2025/26 season is wiped. These samples must be grabbed before then.

## What the rank model needs

For each captured gameweek + cohort we store a **score distribution** — a histogram and
key percentiles over the per-manager gameweek totals. The manager total comes directly
from the picks payload (`entry_history.points`), so no separate live-points join is
required for finished gameweeks.

The canonical distribution algorithm is `computeScoreDistribution` in
`packages/fpl-client/src/score-distribution.ts` (unit-tested). The ops script
`scripts/build-score-distribution.mjs` mirrors it for offline use.

## ⚠️ Where this runs

The scrape **must run from a host that can reach `fantasy.premierleague.com` / the
Worker** — i.e. Pete's laptop. It will **not** run from CI, scheduled agents, or the
Claude-on-the-web container: those environments enforce a network allowlist and every
FPL/Worker host returns `403 Host not in allowlist`. This matches the warning in
`scripts/scrape-cohort-picks.mjs` ("DO NOT run it from CI or scheduled workers").

## Runbook (per gameweek)

The Worker proxy base in the scrape script's default is stale — always pass `--base`:

```
BASE=https://simplyfpl-worker.pete-9c4.workers.dev

# 1. Scrape ~2500 managers per cohort for the gameweek (single command — see gotcha).
node scripts/scrape-cohort-picks.mjs --gw=38 --max=2500 --base=$BASE

# 2. Build the score-distribution + raw scores summaries from the scraped picks.
node scripts/build-score-distribution.mjs --gw=38
```

Outputs land in `var/cohorts/gw38/`:

- `picks.jsonl` — raw scraped picks (gitignored; large; keep local or push to R2).
- `score-distribution.json` — histogram + percentiles per cohort (**committed**).
- `scores.json` — compact per-cohort score arrays for re-binning later (**committed**).

**Gotcha:** the scrape truncates `picks.jsonl` at the start of every run. Do **not** run
it once per cohort into the same gameweek — that wipes the previous cohort. A single
invocation (omit `--cohort`) captures `top_10k`, `overall` and `legendary` together.
Use `--cohort=top_10k` only if you intend to capture that cohort alone.

Pacing is built in: ~2 req/sec with exponential backoff on 429. A full gameweek
(~2500 × 3 cohorts) takes a while — that is expected and polite. Let it run.

### Cohort notes

- `top_10k` — top of the global Overall league (ranks 1..N); `--max` slices the top.
- `overall` — random entry IDs across a dense range as a rough population proxy.
- `legendary` — currently a duplicate of the top 1000; ignore for calibration.

## Capture plan & status

Target a representative spread (prioritise GW38 and recent gameweeks), not all 38.
Suggested set: **38, 37, 36, 28, 19, 10, 1** (late → early), cohorts `top_10k` + `overall`,
~2500 managers each.

| GW | top_10k | overall | Notes |
| -- | ------- | ------- | ----- |
| 38 | ☑ | ☑ | **Priority** — final standings; grab first |
| 37 | ☑ | ☑ | recent |
| 36 | ☑ | ☑ | recent |
| 28 | ☑ | ☑ | late-season |
| 19 | ☑ | ☑ | mid-season |
| 10 | ☑ | ☑ | early-season |
| 1  | ☑ | ☑ | season opener |

**Status (2026-06-02):** the suggested spread (38, 37, 36, 28, 19, 10, 1) is captured
from Pete's laptop — `legendary` (top 1000) is also grabbed alongside `top_10k` +
`overall`. Each gameweek holds 6000 picks (2500 + 2500 + 1000). The remaining 31
gameweeks (2–9, 11–18, 20–27, 29–35) are being captured to complete the full season
before the August wipe; tick them off as they land.

Tick a box and commit the two summary JSONs once a gameweek/cohort is captured.
