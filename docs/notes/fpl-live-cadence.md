# FPL `/event/{gw}/live/` update cadence — measurement (LF-01)

Status: **First findings in** (GW36 single-match, 2026-05-13). Multi-match GW37 measurement scheduled for the weekend.
Last updated: 2026-05-14
Issue: [#72](https://github.com/pete-watters/simply-fpl/issues/72) (closed via #104)
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

## Findings — GW36 single-match run (2026-05-13)

Observation window: 2026-05-13T18:04:59Z → 2026-05-13T22:57:02Z (292 min, 1760 observations). One fixture in GW36 (kickoff 19:00 UTC).

| State       |   Obs | Errors | Changes | Median Δ | p95 Δ | Max Δ | Avg payload |
| ----------- | ----: | -----: | ------: | -------: | ----: | ----: | ----------- |
| `match`     | 1,557 |      0 |      87 |    5.0 s | 5.0 s | 6.1 s | 572.6 KB    |
| `pre`       |   117 |      0 |       0 |        — |     — |     — | 571.8 KB    |
| `live-idle` |    73 |      0 |       0 |        — |     — |     — | 573.0 KB    |
| `off`       |    13 |      0 |       2 |  5.0 min | 5.0 m | 5.0 m | 574.2 KB    |

Key signals:

- **Zero rate-limiting** at any cadence we used (peak 5 s during a 2 h match window). FPL's edge tolerated us cleanly.
- **`pre` and `live-idle` were silent** — 190 observations across the two states, zero detected changes. Polling these states aggressively is pure waste.
- **Payload stayed flat** at ~572 KB across the full run (0% growth) — no `explain` accumulation problem in a single-match GW.
- **`match` median Δ exactly 5.0 s** — see methodological caveat below before reading too much into this.

### Methodological caveat — Nyquist artifact in `match` numbers

The 5.0 s median change interval observed in `match` is **at our polling rate**, not necessarily FPL's true upstream update rate. We polled every 5 s; if FPL actually updates every 2 s (e.g. fresh BPS deltas streaming in mid-attack), we couldn't detect it — every observation would still differ from the last. The 5.0 s median is a floor we measured, not a ceiling on FPL's update frequency.

What we _can_ say from this data: FPL updates `/event/live/` **at least every ~5 s during active play, and probably faster**. To find the actual upstream rate we need a follow-up run at 1 s or sub-second cadence over a short match window. Until then, the safe LF-04 starting cadence is ~5 s and we tune down once we know FPL's true rate.

## Implications for RFC 001 cadence

RFC 001 §6 proposed: 15 s match / 30 s pre / 60 s live-idle / 5 min off. Revised proposal based on GW36 data:

| State       | RFC 001 placeholder | Observed implication                                                             | **Proposed LF-04 cadence**                                                       |
| ----------- | ------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `match`     | 15 s                | FPL updates ≤ 5 s. Anything > 5 s leaves freshness on the table.                 | **5 s** (tune down after a faster-cadence follow-up confirms true upstream rate) |
| `pre`       | 30 s                | Zero changes observed in 117 obs across 30 min pre-kickoff.                      | **120 s** — there is nothing to poll for                                         |
| `live-idle` | 60 s                | Zero changes observed in 73 obs across ~1 h between matches.                     | **120 s** — same reasoning                                                       |
| `off`       | 5 min               | 2 changes observed at 5 min cadence — almost certainly the GW finalisation pass. | **5 min** — unchanged                                                            |

Net effect: **`match` gets ~3× tighter** (15 s → 5 s) and **`pre` / `live-idle` halve their request volume** (no information to gain there). The proposal needs RFC 001 §6 updating; that lives in the LF-04 PR rather than this one (which is the findings record).

## Open questions surfaced by this run

- Goal-event ingestion lag: did the 1 goal in tonight's fixture appear in `/event/live/` within 5 s of broadcast, or slower? Manual stopwatch needed during a Saturday/Sunday game — flagged as a follow-up next experiment.
- Bonus settling cadence: GW36's bonus locks happened during the run but we didn't separately tag the `match → live-idle → bonus-locked` transition. Could be its own state in a future revision of the script.
- Multi-match behavior: GW36 was a one-match midweek. GW37 weekend is the real stress test (next).

## Next experiments (in priority order)

1. **GW37 weekend multi-match measurement** — Sat–Sun continuous, captures parallel fixtures + bonus settling. Auto-stop scheduler already set up via `scripts/start-cadence-soak.sh`.
2. **Sub-second cadence probe** — short 30 min run during a peak match minute (e.g. last 15 min when goals cluster) at 1 s or 500 ms cadence. Find FPL's true upstream rate. New, small script.
3. **Worker KV mirror staleness vs DO snapshot** — only possible once LF-04 lands. Confirms the fan-out value proposition.

## Tools shipped with this PR

- **`scripts/analyze-fpl-cadence.mjs`** — reads JSONL files, produces the by-state cadence table + summary. Used by the auto-stop chain.
- **`scripts/start-cadence-soak.sh`** — one-command wrapper for weekend runs. Starts the measurement under `caffeinate` (keeps macOS awake), schedules an auto-kill + analyzer at a baked-in stop time, detaches everything. Currently set to stop Sun 2026-05-17 21:00 UTC for the GW37 weekend. Update the `STOP_AT_UTC` constant for future weekends.

## Open follow-ups (out of scope for LF-01)

- Repeating the measurement under different upstream conditions (deadline day, double gameweek, blank gameweek) once they happen.
- Parameterising `start-cadence-soak.sh` to accept stop time as a CLI argument so we don't hand-edit the constant each weekend.
