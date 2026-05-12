# FPL `/event/{gw}/live/` update cadence — measurement (LF-01)

Status: **Pending data collection** — script ready, awaiting a live match week.
Last updated: 2026-05-12
Issue: [#72](https://github.com/pete-watters/simply-fpl/issues/72)
RFC: [001 Live Fan-Out](../rfcs/001-live-fanout.md)

## Why this matters

RFC 001 §6 proposes adaptive polling cadences (15 s during matches, 60 s near full-time, 5 min when idle) for the live fan-out Durable Object. Those numbers are guesses. If FPL actually updates `/event/{gw}/live/` every 30 s upstream, our 15 s polling is wasted requests and a rate-limit risk. If they update every 5 s, our 15 s polling leaves freshness on the table. We need real data before tuning.

## How to run

```sh
# Auto-detect current/next GW
node scripts/measure-fpl-cadence.mjs

# Specific GW
node scripts/measure-fpl-cadence.mjs 39
```

Requires Node 22+. Polls FPL directly (`fantasy.premierleague.com/api`) — **bypasses our worker KV cache** so we observe the real upstream update interval, not our cache TTL.

Adaptive cadence (mirrors what the DO will eventually do):

| State                               | Poll cadence |
| ----------------------------------- | ------------ |
| match in progress (fixture 0–130 m) | 5 s          |
| kickoff within 30 m                 | 15 s         |
| GW live but no active match         | 60 s         |
| GW finished / off-season            | 5 min        |

Output: JSONL at `var/fpl-cadence-gw{N}-{timestamp}.jsonl` (one line per observation: timestamp, state, http status, body hash, changed-element count). The script prints a running summary every 60 observations and on exit (Ctrl+C / SIGTERM).

The `var/` directory is gitignored. Output stays local.

## What to capture

To make the data defensible, run the script across a full GW including:

- the deadline + pre-match warm-up (state = `pre`)
- at least one full match (state = `match`)
- the gap between Saturday and Sunday games (state = `live-idle`)
- the bonus-finalisation window (~2 h after final fixture FT)

A weekend pass with at least one Saturday 12:30 and one Sunday 16:30 is the minimum useful sample.

## Findings — to be populated

Replace this section once you have a full match-week of JSONL data.

| State     | Sample size | Median change interval | p95   | Notes |
| --------- | ----------- | ---------------------- | ----- | ----- |
| match     | _TBD_       | _TBD_                  | _TBD_ |       |
| pre       | _TBD_       | _TBD_                  | _TBD_ |       |
| live-idle | _TBD_       | _TBD_                  | _TBD_ |       |
| off       | _TBD_       | _TBD_                  | _TBD_ |       |

Observations to look for:

- Does the `bonus` field churn faster or slower than `bps` mid-match?
- Are there any goal events that take >30 s to show up in `/event/live/` after they happened on TV?
- Does the response payload size grow over the GW (more `explain` entries accumulate)?
- Any HTTP 429 / rate-limit signals when polling at 5 s for an hour?

## Implications for RFC 001 cadence — TBD

Once findings are in, update RFC 001 §6 with empirical numbers and either:

1. Confirm the 15 s / 60 s / 5 min cadences are appropriate, or
2. Propose revised cadences with the data to back them.

## Open follow-ups (out of scope for LF-01)

- A small analysis script (`scripts/analyze-fpl-cadence.mjs`) that reads the JSONL and produces the summary table automatically.
- Repeating the measurement under different upstream conditions (deadline day, double gameweek, blank gameweek) once they happen.
