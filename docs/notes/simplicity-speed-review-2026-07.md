# Simplicity & speed review — July 2026

Lens: **simplicity** (dead code, over-abstraction, duplication), **speed** (bundle, render, network), **accuracy** (where a displayed FPL number can silently be wrong). Complements the security/caching audit in `audit-2026-07.md` — no overlap intended. Findings ranked by user-visible impact.

## Deleted in this PR (zero behaviour change, verified unimported)

| What                                                   | LOC | Why it was safe                                                                                                                                                                                                |
| ------------------------------------------------------ | --: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/features/src/live-rank/compute-rank.ts`      |  75 | `computeLiveRank` threw `not yet implemented`; no caller anywhere. The shipped path is `computeLiveRankEstimate` (`use-live-rank-estimate.ts`) + the worker cohort/DO pipeline. Barrel export removed with it. |
| `apps/web/src/components/views/live-rank-showcase.tsx` | 154 | No importer in web or mobile. Superseded by `live-rank-real-view` + `/replay`.                                                                                                                                 |

Note: the doc-comment example at `packages/features/src/index.ts:11` still references `computeLiveRank`; left untouched per the no-comment-edits rule — flagging here instead.

## Accuracy

### A1 — Launch-day ranks fall back to the flat-700 heuristic (HIGH, gets worse at exactly launch)

`estimateLiveRankSmart` (`packages/fpl-client/src/live-rank.ts:181`) uses captured empirical score distributions when `hasDistribution(gw, 'overall')` — but every capture is from **2025-26**. On 2026-27 GW1 (launch weekend) there are no distributions, so every rank estimate degrades to `estimateLiveRank`'s `PLACES_PER_POINT = 700` linear guess (`live-rank.ts:151-165`). The product's headline accuracy claim is weakest on the exact day the most new users judge it.

**Fix:** before GW1, wire the estimate to the worker's live cohort aggregates (already computed per-GW) with the static distribution as second preference and flat-700 as last resort; capture the new season's distribution from GW1 live data as soon as it exists (the `gw38-capture` machinery generalises).

### A2 — Provisional-bonus window at fixture end needs a fixture-based regression test (MEDIUM)

`predictBonusPoints` (`packages/fpl-client/src/bonus-points.ts`) treats `finished || finished_provisional` as "official bonus is already inside `total_points`" and stops adding predicted bonus. In the real API there is a short window around `finished_provisional` flipping where `stats.bonus` is populated but `total_points` may not yet include it — in that window a captain's displayed points can drop by `2 × bonus` (added as provisional one tick, absent the next, official the tick after). The unit fixtures all assume clean states; none capture the transition tick.

**Fix:** record one real transition (live endpoint snapshots ~1 min apart around a fixture end, first live GW) and add a fixture-based spec asserting monotonic non-decreasing displayed points through the window; if the drop reproduces, bridge by keeping the provisional add until `total_points` visibly includes bonus.

### A3 — Captain multiplier recomputed instead of using `pick.multiplier` (MEDIUM, simplifies too)

`calculateLivePoints` (`packages/fpl-client/src/live-rank.ts:47-50`) rebuilds the multiplier from `pick.is_captain` + chip flags. The picks payload already carries `pick.multiplier` (0 = benched, 2 = captain, 3 = TC — and it reflects vice-captain promotion once FPL applies it). Recomputing invites drift for edge cases (VC promotion mid-GW, future chip types) that the API already resolves.

**Fix (behavioural, issue not PR):** prefer `pick.multiplier` when present; keep the derived path only for provisional bonus (which must be multiplied manually either way). Existing BDD specs pin current behaviour, so this is a deliberate, tested change.

## Speed

### S1 — Tamagui runtime-only mode remains the single biggest lever (reference)

Tracked in #49/#390 (perf agent has it in hand today) — compile-time extraction is worth more than everything below combined: smaller client JS, no FOUC, static prerender for `/rank/[entryId]`. Nothing new added here; just keeping it ranked where it belongs: first.

### S2 — Home route sits 4.6 kB under budget; the next feature pays the piper

`/` is at ~205.4 kB gz against 210. The stat tiles, cohort table, battle panel and status pill all load statically; only the pitch is dynamic. Before the next home-surface feature (team news card is queued), move one more below-the-fold block (`LiveBattlePanel` or the cohort table) behind `next/dynamic` — cheap now, disruptive later.

### S3 — What's already right (do not churn)

WS-first live updates with polling only when `shouldFallback` (`use-live-snapshot.ts`) — no double transport. Slim worker payloads (`bootstrap-static-slim`, `fixtures-slim`, `leagues summary`) doing exactly what a proxy should. Query intervals respect the 60 s live cadence. `AdSlot` placeholder reserves height (no CLS).

## Simplicity

### C1 — `live-rank-real-view.tsx` is 1,018 lines in a repo that mandates thin apps

It contains data orchestration, layout, formatting helpers, grid styles and sub-components in one file. CLAUDE.md puts composition in `ui` and orchestration in `features`. Don't do a big-bang split: the design-direction work (PR #427) already touches these sections — extract per-section (`stat grid`, `hero`, `battle panel column`) as that lands, each extraction ≤150 LOC with its existing tests moved along.

### C2 — `demo-data.ts` (262 LOC) is now ~half dead

Its two consumers were `live-rank-showcase` (deleted above) and the flag-gated `prices-view`. When Prices ships for real (`FEATURE_PRICES`), its queries replace the demo constants; delete the file then. Not deleted now to keep the flag-on dev experience working.

## Do-not-do list (tempting, net-negative)

- **Don't unify the three pitch renderers** (web live pitch, h2h `PitchPair`, mobile pitch). They diverge deliberately (compact sizing, onPitch label ladders, platform constraints); a shared abstraction would couple three surfaces that change for different reasons.
- **Don't merge `estimateLiveRank` into `estimateLiveRankSmart`.** The flat heuristic is the documented last-resort fallback; inlining it hides the accuracy tiering that A1 makes explicit.
- **Don't add a data-fetching abstraction over React Query.** The per-query `refetchInterval` discipline is the feature; a wrapper would just relocate it.
- **Don't split `packages/fpl-client` further.** File-per-domain with co-located `.feature` specs is already the right altitude.

## Tally

- Deleted: **229 LOC** (this PR)
- Deferred deletions: `demo-data.ts` (~130 LOC net) when Prices ships
- Issues filed: #430 (A1 launch-day rank accuracy), #431 (A2 bonus-window fixture test), #432 (A3 `pick.multiplier`), #433 (S2 pre-emptive dynamic import)
