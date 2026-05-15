# RFC 004 — LiveFPL-Parity Surfaces (Cohort Benchmarks, Helpers/Hurters, Rank Cards)

**Status:** Draft, 2026-05-14
**Author:** Pete (via Claude)
**Driver:** Co-founder feedback — "the 3 livefpl views are all we need". Re-scopes the launch around livefpl-parity. Keeps `/h2h/[a]/[b]` (cool, retained). May drop `/leagues` from the launch nav.

## Why this exists

LiveFPL's product is built around three surfaces:

1. **Pitch** with per-player ownership %, top10k ownership %, emoji indicators, and **benchmark scores** (Safety / Top10k / Elite / Overall) at the top.
2. **Stats table** comparing You vs Top10k vs Overall vs Legendary across Score, Players played, Budget used, and Captain points.
3. **Rank details** cards — current rank, Off Top 10K (delta vs cohort avg), Off 25K, Safety (score needed to maintain rank tier), Pre-/Post-subs rank.

Plus a fourth surface **only during matches**: a **Helpers / Hurters** widget showing which of your players are gaining you ranks (your_player_pts × your_ownership_edge_vs_cohort) and which are losing you ranks.

These surfaces don't exist in SimplyFPL today and they all depend on a **cohort benchmark dataset** that FPL doesn't expose directly. We have to maintain it ourselves.

## The cohort engine — the keystone

Everything else depends on this. Without cohort data we ship a prettier livefpl with fewer numbers.

### What the engine produces

Per gameweek, per cohort (Top10k, Top25k, Top100k, Overall, Legendary tier ≈ Top1k):

- `averageScore` — cohort's average GW points
- `averagePlayersPlayed` — out of 15
- `averageBudgetUsed` — sum of `now_cost` of picks
- `averageCaptainPoints` — captain pts × multiplier
- `playerOwnership` — `Map<elementId, ownershipPercent>` (how many in cohort own each player)
- `captainOwnership` — `Map<elementId, percent>` (how many captained each player)
- `topThreshold` — score needed at the cohort cutoff (the "Safety" / "Off 25K" inputs)

### How the engine gets it

1. **Source**: FPL's `/leagues-classic/314/standings/?page_standings=N` (Overall league, ~13M entries) gives entry IDs ranked by total points.
2. **Fetch top N entries' GW picks**: `/entry/{id}/event/{gw}/picks/` for each — gives their squad, captain, multipliers.
3. **Aggregate**: for each player, count how many of the cohort picked them / captained them.
4. **Live update**: while a GW is in progress, re-fetch and recompute every ~5 min.

### Engine sizing

- Top 10k → 10,000 picks endpoints per GW = ~10k HTTP requests
- Worker subrequest limit is 50 per request, so we batch via `ctx.waitUntil` across many cron firings, OR use Durable Object alarms.
- KV writes: 10k entries × ~2KB picks payload = ~20MB raw. We **don't** store raw picks; we store the aggregated cohort dataset (~50KB per GW). That fits trivially in KV.

### Engine v0 scope (what ships first)

- Just **Top10k** and **Overall** cohorts (skip Top25k, Top100k, Legendary for now).
- Just at deadline + once per hour during live matches (no 5-min cadence yet — that's LF-04 territory).
- Store one snapshot per GW in KV: `cohort:gw:{N}:top10k` and `cohort:gw:{N}:overall`.

### Backfill plan

We can backfill GW36 by fetching the same data retrospectively (FPL still serves past-GW picks). That gives us a "day 1" dataset for launch.

## Frontend surfaces

### 1. Pitch overlays (depends on cohort engine for top10k %, partial without)

- Per-player row underneath each kit:
  - Two stat cells: left = `selected_by_percent` (global ownership, FREE from bootstrap), right = top10k ownership (NEEDS COHORT)
  - Emoji indicator:
    - ⭐ owned by < 30% of top10k and scored ≥ 8 (differential picked off)
    - 🎨 captained by < 20% of top10k (differential captain)
    - 😴 on bench but scored ≥ 6 (sleeper bench)
    - 👎 owned by ≥ 50% but scored ≤ 2 (template player flopped)
- Header strip above pitch: Safety / Top10k / Elite / Overall cohort scores

### 2. Stats table (depends on cohort engine)

Four-column table:

| Stat          | You               | Top10k     | Overall    | Legendary  |
| ------------- | ----------------- | ---------- | ---------- | ---------- |
| Score         | from live data    | cohort avg | cohort avg | cohort avg |
| Players       | your played / 11  | cohort avg | cohort avg | cohort avg |
| Budget played | sum of pick costs | cohort avg | cohort avg | cohort avg |
| (c) pts       | your captain pts  | cohort avg | cohort avg | cohort avg |

### 3. Rank details (mostly depends on cohort engine)

Six cards:

- GW LIVE — your live score (FREE)
- TOTAL — your overall total (FREE, from entry)
- BENCH — bench points (FREE)
- SAFETY — score needed to maintain top% tier (NEEDS COHORT)
- OFF TOP 10K — `you - top10k_avg`, signed (NEEDS COHORT)
- OFF 25K — `you - top25k_avg`, signed (NEEDS COHORT)

Plus a banner row: Pre-subs rank vs Post-subs rank, with % change. Pre/post is computable from `picks.automatic_subs` + `picks.entry_history.rank` — no cohort needed.

### 4. Helpers / Hurters (depends on cohort engine + live cadence)

Visible only during a live match window. Two columns:

- **Helpers** — your players ranked by `(player_points × (1 - top10k_ownership))` descending. "Salah captained, only 35% in top10k captained him → +X net rank movement"
- **Hurters** — your players ranked by `(top10k_avg_points_for_owned_players - your_player_points × top10k_ownership)`. "Top10k mostly owned Watkins, he hauled, you didn't have him → -Y"

This is the "during matches" widget the co-founder mentioned. It's the killer feature and the hardest to get right.

## Implementation order

| Step                                                | Owner                                    | Where                             | Notes                                                   |
| --------------------------------------------------- | ---------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| LP-01 RFC (this doc)                                | in-session                               | `docs/rfcs/004-livefpl-parity.md` | ✓ done                                                  |
| LP-02 Cohort engine v0 + backfill GW36              | scheduled agent                          | `apps/worker` + KV                | DRAFT PR — needs human review for wrangler.toml changes |
| LP-03 Per-player ownership % on pitch (global only) | in-session                               | `packages/ui` + `apps/web`        | cohort-free quick win                                   |
| LP-04 Pre/Post-subs rank in rank-details panel      | follow-up                                | `apps/web`                        | cohort-free                                             |
| LP-05 Benchmark scores strip above pitch            | depends on LP-02                         | `apps/web`                        | post-engine                                             |
| LP-06 Stats table component                         | depends on LP-02                         | `packages/ui` + `apps/web`        | post-engine                                             |
| LP-07 Rank details cards                            | depends on LP-02                         | `apps/web`                        | post-engine                                             |
| LP-08 Helpers/Hurters widget                        | depends on LP-02 + LF-04 (live snapshot) | `apps/web`                        | post-engine + live cadence                              |

LP-02 is the critical path. LP-03 / LP-04 are visual progress today.

## Risks

- **FPL rate limiting** the cohort fetch. Mitigation: KV-cache picks for 1h, fetch top10k in batches across multiple worker firings, identify ourselves with a clear UA, back off on 429.
- **GW37 deadline missed** if engine isn't live by Fri evening. Mitigation: backfill GW36 now so we have a launch dataset regardless.
- **Off-season blackout** — after GW38 (~25 May) there's no live data until August. Engine idle for 2.5 months. Mitigation: nothing to do, just be aware. Use the gap to refine the UI on backfilled data.
- **Worker subrequest budget** — 10k requests is a lot. May need to split across multiple cron firings or use a queue.
- **`packages/features` rules** — cohort engine code that's React-aware goes in `packages/features`; pure data-fetching goes in `packages/fpl-client`. Don't mix.

## Out of scope (explicitly)

- Top25k, Top100k, Top1m cohort tracking — v0 ships Top10k + Overall only
- Legendary cohort (≈ top 1k by season points) — added once Top10k is stable
- Historical cohort archive (multi-season) — not until well after launch
- Mobile-specific cohort views — web only
