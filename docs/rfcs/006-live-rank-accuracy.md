# RFC 006 — Live-Rank Accuracy

Status: Draft
Author: Pete
Last updated: 2026-05-25
Workstream slug: `rank-accuracy`
Depends on: RFC 005 (simulator harness — reuses `expected-curve.ts` + the season archive for offline replay); soft overlap with RFC 004 (cohort engine — the Phase-2 empirical refinement rides on the same picks-fetch infrastructure).

## 1. Problem statement

SimplyFPL's live overall-rank estimate is a flat, rank-independent linear heuristic. `estimateLiveRank()` in `packages/fpl-client/src/live-rank.ts:148-160` is the whole model:

```ts
const PLACES_PER_POINT = 700; // live-rank.ts:146
const delta = livePoints - avgEntryScore; // live-rank.ts:153
const movement = Math.round(delta * PLACES_PER_POINT); // live-rank.ts:154
const liveRank = Math.max(1, preGwRank - movement); // live-rank.ts:155
```

It is orchestrated by `computeLiveRankEstimate()` in `packages/features/src/live-rank/use-live-rank-estimate.ts:33-41`, which sources its three inputs as:

- `preGwRank = entry.summary_overall_rank` (`use-live-rank-estimate.ts:35`),
- `livePoints = calculateLivePoints(...)` (`use-live-rank-estimate.ts:38`),
- `avgEntryScore = bootstrap.events.find(e => e.id === gw).average_entry_score` (`use-live-rank-estimate.ts:39`).

`computeRankDetails()` (`live-rank.ts:169-184`) derives the pre-/post-subs rank lines by calling `estimateLiveRank()` twice with two point totals, so the same flat curve drives every rank number on screen.

### Why flat-700 is structurally wrong

Real FPL overall-rank density is **highly non-linear**. Near the top of the table the score distribution is dense and steep: one extra point can be worth tens of thousands of places. Around the median it is sparse and flat: the same point is worth far fewer places. A single global `PLACES_PER_POINT` cannot be right at both ends — it is a tangent line fitted to a curve, and it diverges badly away from the fit point.

The existing test suite encodes the absurdity it produces. `live-rank.spec.ts:505-526` asserts that a manager at rank **500** who scores 70 above average "moves up 49000" places and clamps to rank 1. At the very top of a 13.1M-manager table there are only 499 managers ahead — a 49,000-place jump is meaningless there, yet the model computes it and the only thing saving the output is the `Math.max(1, ...)` clamp. The flatness is hidden by the clamp at the top and simply unverified everywhere else.

### Observed symptom

In a real GW38 spot check, our estimate read **~35k** for a team that livefpl read **~65k** for the same side and the same points — i.e. we **over-climb above-average scores in the top band**. The flat 700 places/point keeps paying out the median-band rate inside the dense top band where each point is worth far fewer places, so an above-average score launches the estimate roughly twice as far up the table as reality. This is exactly the band (top-100k) where our users care most about accuracy, and exactly where livefpl is strongest.

### Dead code that misrepresents the state of the model

`packages/features/src/live-rank/compute-rank.ts` is a stub: `computeLiveRank()` (`compute-rank.ts:72-75`) throws `"computeLiveRank not yet implemented"`. Its doc comment (`compute-rank.ts:10-19`) promises a model that "compares the manager's live points to a sampled distribution from the top-N managers we cache in KV" and cites `infra/worker/rank-sampler.ts` — **a file that does not exist in the repo**. So the codebase advertises a distribution model that was never built; only the 700 heuristic ships. This RFC supersedes that stub and either wires it up or deletes it (see §4).

### Issue history

- **#172** specced the distribution model, then was closed claiming "implemented" — but only the flat-700 heuristic shipped. The model #172 described is the model this RFC actually builds.
- **#183** (RFC 005 Phase B, the manager-distribution overlay) is the open path. The simulator already builds an expected curve from a manager pool; we extend it into a validated estimator and a regression harness rather than starting fresh.

## 2. Goals / non-goals

### Goals

- The live-rank estimate lands **within a stated error band of FPL's real overall rank** across the table, with the tightest band in the **top-100k**. Target (to be ratified by the Phase-1 numbers, not asserted blind): median absolute error **≤ 25%** of true rank overall, and **≤ 15%** inside the top-100k band — both materially better than flat-700's measured error.
- Works **live, each minute** — the model must be a pure function cheap enough to run inside `computeLiveRankEstimate()` on the 60s refetch loop, with no extra network round-trip on the hot path.
- **Degrades gracefully** — if the better model's inputs are unavailable (e.g. a fitted parameter is missing for an early GW), it falls back to a defined behaviour, never NaN/crash. The old heuristic stays reachable behind a flag for rollback.
- Every change to the model is **gated by an offline regression harness** (Phase 1) that runs in CI with zero live data.

### Non-goals

- Sub-place precision. Overall rank is an estimate; we quote a number and (optionally) a band, not a guarantee.
- Per-mini-league live ordering — `buildLiveLeagueTable()` (`live-rank.ts:61-89`) already does exact intra-league sorting from points; that is correct and untouched.
- A live empirical sampler at launch. We cannot validate one until GW1 (§4 explains why) so it is explicitly deferred to a post-launch phase.
- Replacing the simulator (RFC 005). We build **on** it.
- Mobile. Web first; the model is pure TS in `fpl-client`, so mobile inherits it for free later.

## 3. Phase 1 — measurement harness (build first, no live data needed)

**This phase ships before any model change.** Its entire job is to quantify how wrong flat-700 is and to become the gate every future model must pass. It needs **no live data** — it replays the committed season archive.

### The ground-truth asset

`var/season-archive/2025-26/` is committed to git (2,496 tracked files; `var/season-archive/2025-26/` is explicitly un-ignored in `.gitignore:16-19`). Verified shapes:

- **`bootstrap-static.json`** — `events[]` each carry `id`, `average_entry_score` (e.g. GW1 = 54), `finished`, `data_checked`; top-level `total_players` = 13,104,126; 38 events.
- **`gw<N>/` for N = 1..37** — `live.json.gz` (gzipped FPL `/event/{gw}/live/`: `elements[].stats.total_points`, plus full BPS/minutes stats) and `fixtures.json`.
- **`league-936326/entry/<id>/` for ~62 managers** — `entry.json` (has `summary_overall_rank`), `picks/gw<N>.json` (FPL picks: `picks[]`, `active_chip`, `automatic_subs[]`, and an `entry_history` block), and crucially **`history.json`**.
- **`history.json`** is the ground truth. Top-level keys `current` / `past` / `chips`. `current` is a 37-element array, one per finished GW, each entry:
  ```json
  {
    "event": 1, "points": 61, "total_points": 61,
    "rank": 2607688, "overall_rank": 2607687, "percentile_rank": 30,
    "event_transfers_cost": 0, "points_on_bench": 12, ...
  }
  ```
  `overall_rank` is **FPL's real end-of-GW overall rank** for that manager. `points` is their real final GW score. This is exactly the truth we never compared against.

### What the harness does

For each archived `(entry, gw)` pair where `gw >= 2` (we need a prior GW for the baseline):

1. **Reconstruct the model inputs from that GW alone** — the same inputs the live app would have had:
   - `preGwRank` = the entry's **prior** GW `overall_rank` (`history.current[gw-2].overall_rank`),
   - `points` = the entry's **final** GW `points` (`history.current[gw-1].points`) — already net of the transfer hit, matching `calculateLivePoints` which deducts `event_transfers_cost` at `live-rank.ts:52`,
   - `avgEntryScore` = `bootstrap.events[gw-1].average_entry_score`.
2. **Run the estimator** — `estimateLiveRank(preGwRank, points, avgEntryScore)` for the current model; a new model exposes the same signature so the harness is model-agnostic.
3. **Compare to truth** — `history.current[gw-1].overall_rank`.

Because we replay **final** GW points, this isolates the _rank model's_ error from live-data noise (bonus provisionality, autosubs). It answers one question precisely: given correct points, how wrong is the points→rank mapping? That is the question flat-700 fails.

### Error metrics

Report, aggregated over all `(entry, gw)` pairs and **broken out by true-rank decile** (so we see the top band specifically):

- **Median absolute error** — `median(|estimate − truth|)` and the percentage form `median(|estimate − truth| / truth)`.
- **Error by rank decile** — bucket each pair by its _true_ `overall_rank` (e.g. 1–10k, 10k–100k, 100k–500k, 500k–1M, 1M+) and report median abs % error per bucket. This is where flat-700's top-band over-climb shows up numerically.
- **Signed bias** — `median(estimate − truth)` per bucket, to confirm direction (the symptom predicts a strong negative bias — estimate too good/too high up — in the top buckets).
- **Coverage** — count of pairs scored, and any skipped (e.g. chip GWs, `preGwRank <= 0`).

### Where it lives and how it runs offline

- **Harness location:** `packages/fpl-client/src/rank-accuracy/replay-archive.ts` (pure TS — reads the archive off disk via `node:fs`, no network, no React). Co-located spec `replay-archive.spec.ts`.
- **Archive reader:** a small loader (`archive-reader.ts`) that resolves `var/season-archive/<season>/...`, ungzips `live.json.gz`, and yields typed `(entry, gw, inputs, truth)` tuples. Reuses the same on-disk layout the simulator already consumes.
- **Report script:** `scripts/measure-rank-accuracy.mjs` — runs the harness across the whole archive and writes a human-readable table (overall + per-decile) to stdout and a JSON report to `var/rank-accuracy/<timestamp>.json` for diffing model-over-model. Mirrors the existing script conventions (`scripts/archive-season.mjs`, `scripts/build-cohort-aggregates.mjs`).
- **CI gate:** a Vitest spec (`replay-archive.spec.ts`) that loads the archive, runs the **current** model, and asserts the **per-decile median abs % error stays at or below a committed baseline** recorded the first time we run it. It runs under the existing `turbo run test:unit` → `vitest run` pipeline — fully offline, no MSW needed since it reads committed fixtures, not the FPL API. Once Phase 2 lands, the baseline numbers are tightened to the new model's results, so any future regression fails CI.

### Acceptance for Phase 1

- Harness scores every eligible archived pair and emits the report.
- The flat-700 baseline numbers are recorded in the spec and in this RFC's eventual follow-up note (we expect a large negative bias in the top buckets, quantifying the 35k-vs-65k symptom across many managers, not just one).
- No model change in this phase — Phase 1 is pure measurement + gate.

## 4. Phase 2 — the model

Two candidate models. We **ship (a) for launch** and **layer (b) post-launch**.

### Option (a) — calibrated statistical distribution (recommended for launch)

Model the GW overall-score distribution analytically, then place the user's score by percentile and map percentile → rank via `total_players`.

1. Treat GW scores across the population as a distribution centred on `average_entry_score` (which the archive gives us per GW) with a **fitted spread** (and, if the fit justifies it, skew — FPL GW scores are mildly right-skewed).
2. For a manager scoring `s`, compute the **percentile** `p = P(X <= s)` under that distribution.
3. Map to rank: `liveRank = round((1 - p) * total_players)`, clamped to `[1, total_players]`.
4. This is inherently **non-linear** — near the mean the CDF is steep (many managers per point), in the tails it is flat (few managers per point) — which is precisely the property flat-700 lacks. The same point is worth different numbers of places depending on where you are, by construction.

For rank _movement_ we anchor on `preGwRank` where available (so the displayed delta is consistent with the user's known starting rank) and use the distribution to compute the _shape_ of the move, rather than a flat multiplier.

**Calibration & validation against the archive:** the spread (and skew) parameters are **fitted** so that, replayed through the Phase-1 harness, the per-decile median error is minimised — especially in the top buckets. The same harness that condemns flat-700 becomes the objective function. A per-GW or per-score-band spread can be fit if a single global spread underperforms; the harness tells us whether the extra parameters earn their keep. The fitted parameters live in a committed constants module (`packages/fpl-client/src/rank-accuracy/distribution-params.ts`), versioned and diffable.

**Why this is the launch choice:** it is **pure, offline-validated, and cheap**. It runs as a function on the 60s loop with no network call, it degrades gracefully (missing fit param → documented fallback, ultimately the old heuristic behind the flag), and — decisively — it is the only option we can _prove out before GW1_ because it validates entirely against committed data.

### Option (b) — empirical sampling via the cohort engine (livefpl-style, post-launch)

This is what livefpl does: sample many managers' live scores, build an **empirical** score→count histogram, and place the user's score by percentile against `total_players` to get rank. No distribution assumption — the histogram _is_ the distribution.

In our stack this rides on the **RFC 004 cohort engine** (which already fetches top-N managers' picks and computes their live scores) plus Supabase to persist the per-GW histogram, refreshed each minute during a live GW. The `compute-rank.ts` stub (`compute-rank.ts:39-44`, `RankDistribution.pointsToRank`) is essentially the type signature for this: a `pointsToRank` map plus `totalEntries`. Phase 2 either wires that stub to the empirical histogram or, if (b) is deferred, deletes the stub so the repo stops advertising an unbuilt model.

**Why it is deferred:** there are **no live GWs until GW1 (~Aug 2026)**. A live sampler can only be _validated_ against reality during a live GW — replaying the archive can fake the sampling but not the live-data dynamics (bonus churn, autosub timing) that are the whole point of sampling live. We cannot ship something at launch we have never seen behave. So (b) is built and validated _after_ GW1, layered on top of (a) to refine the top band where empirical sampling beats any parametric fit.

### Recommendation

Ship **(a)** as the reliable, offline-validated baseline for launch. Keep flat-700 behind a flag for one GW as the rollback. Build **(b)** once GW1 gives us live ground truth, and blend: use (b)'s empirical histogram where the live sample is dense (top band), fall back to (a)'s parametric curve in the sparse tail and before the sample warms up.

## 5. Phase 3 — data expansion before the wipe

FPL wipes the 2025/26 endpoints around **Aug 2026**. After that the only ground truth we will ever have for calibrating (a) is whatever we archived first.

**The problem with the current archive for calibration:** it is one thin league — `league-936326`, ~62 managers, mid-table and skewed. That is fine for the _plumbing_ (and for Phase-1 measurement of the gross error) but it is **too sparse and too skewed** to fit the spread in the **top-1k / 10k / 100k** band, which is exactly where accuracy matters most and where flat-700 fails worst. We cannot calibrate a top-band curve from managers who were never in the top band.

**Proposal:** before the wipe, archive a sample **stratified across rank tiers** so the fit has data at every density:

- Page the **global classic league 314** (`/leagues-classic/314/standings/?page_standings=N`, ranked by total points) across chosen overall-rank ranges — e.g. ranks 1–1k, a slice around 10k, around 100k, around 1M, and a median slice — capturing each sampled entry's `history.json` (which carries that manager's real per-GW `overall_rank` across the whole season). A few hundred to low-thousands of entries spread across tiers is enough to fit a spread per band; we do **not** need the full 13M.
- **Throttled for FPL rate limits and resumable**, reusing the existing `scripts/archive-season.mjs` patterns: it already does 300–500ms jittered gaps with exponential backoff on 429/5xx (`archive-season.mjs:7-8`, the `MIN_GAP_MS`/`MAX_GAP_MS`/backoff constants), is idempotent (skips existing files), and already pages standings by `page_standings` (`archive-season.mjs:182`) with `--league` and `--max-entries` flags. The extension is a stratified-page selector (fetch specific rank windows rather than only the top of one league) writing into a parallel `league-314-strata/` tree.

**Decided sequence (do not reorder):**

1. **Back up the current archive** (it is the irreplaceable thin-league asset — copy/tag before any new write touches `var/`).
2. **Run Phase-1 measurement on what we already have.** Quantify flat-700's error from the 62-manager league first. We may already have enough signal to justify (a)'s shape without any expansion.
3. **Then expand if (and only if) the numbers justify it** — i.e. if Phase-1 shows the top-band error is large (it will) _and_ the thin league lacks the top-band coverage to fit (a) reliably (it does). Expansion is gated on Phase-1, not assumed.

This sequencing keeps us from spending a rate-limited multi-hour scrape before we have proven we need it, while still beating the August wipe.

## 6. Validation & go-live

1. **Offline regression gate (Phase 1).** New model must beat the recorded flat-700 baseline per decile in `replay-archive.spec.ts`, in CI, offline. This is the merge gate.
2. **Flagged rollout.** Model (a) ships behind a flag (`RANK_MODEL = 'distribution' | 'flat700'`, default `distribution` once the gate is green). `computeLiveRankEstimate()` (`use-live-rank-estimate.ts:33`) selects the model; both implement the same `estimateLiveRank` signature so callers and the existing `live-rank-pill` UI are untouched.
3. **GW1 as first live proof.** GW1 (~Aug 2026) is the first time we see the model against live FPL ranks. Compare our number against livefpl and against the post-GW real `overall_rank` for known test entries (Sam J = 219895, Cameron = 4173513). A clean GW1 unblocks building (b).
4. **Rollback.** Flip the flag back to `flat700`. Pure-function swap, no data migration, no deploy risk beyond a config change.

## 7. Risks & open questions

- **Gross vs net points.** `calculateLivePoints` already deducts the transfer hit (`live-rank.ts:52`, `totalPoints -= picks.entry_history.event_transfers_cost`). The archive's `history.current[].points` is likewise **net** of the hit. So the harness compares net-to-net — consistent. The risk is a future model accidentally double-counting or ignoring the hit; the harness will catch a systematic bias if it does.
- **`average_entry_score`: live vs final.** During a live GW, `bootstrap.events[gw].average_entry_score` is FPL's _current_ average and drifts upward as matches complete; the archive only has the _final_ value. So (a) calibrated on final averages may be slightly off mid-GW when fed a live (lower) average. Mitigation: the distribution is anchored on the _relative_ gap `points − avg`, which is more stable than either absolute, and (b)'s live sampling sidesteps it entirely once built. Flag for GW1 observation.
- **`total_players` drift mid-season.** Managers enter/leave; `total_players` (13.1M in this archive) is not constant across a real season and grows early then plateaus. The percentile→rank map in (a) uses the _current_ `total_players` from live bootstrap, so it self-corrects; the harness uses the archived value per the GW it replays. Note it so a future reader does not hard-code the constant.
- **Distribution shape assumption (a).** If FPL GW scores are too non-Gaussian for a simple fitted spread (heavy skew/kurtosis), a single parametric family may not fit all bands. Open question: do we fit one global family, per-band spreads, or a piecewise/empirical-from-archive curve? The Phase-1 harness is the referee — we pick whatever minimises per-decile error without overfitting the 62-manager sample.
- **Thin-archive overfitting.** Calibrating (a) on 62 mid-table managers risks a curve that is great mid-table and useless up top — the exact failure we are fixing. This is _the_ reason Phase 3 exists; until expansion lands, treat top-band fit parameters as provisional and lean on the `preGwRank` anchor.
- **`compute-rank.ts` stub disposition.** Open decision: wire it to (b), or delete it now and re-introduce a clean type when (b) is built. Leaving a throwing stub that references a non-existent file (`compute-rank.ts:13`) is a trap for the next reader. Recommend deleting in the Phase-2 PR.
- **Issue #172 hygiene.** #172 is closed-as-implemented but was not. Reopen or supersede it with a link to this RFC so the tracker reflects reality; continue the real work under #183.

## 8. Out of scope

- The live empirical sampler itself (Option b implementation) — post-GW1, on the RFC 004 cohort engine.
- Any UI change. The numbers get more accurate; the `live-rank-pill` and rank-details surfaces render the same fields.
- Confidence-interval display ("~65k ± 8k"). Attractive once we have an error model from Phase 1, but a follow-up.
- Mini-league live ordering (already correct).
- Mobile.
