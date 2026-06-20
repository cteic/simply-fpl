# gw36 simulator recording (RFC 005 Phase B)

A deterministic, self-contained test bed for the cohort live-rank estimator. The
files here are the offline-derived inputs and ground truth the BDD harness at
`packages/features/src/live-rank/cohort-simulator.spec.ts` replays at 10x speed
(replay mode from RFC 005 Phase A).

## Files

| File                        | What it is                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `recording.jsonl`           | Canonical per-frame replay rows (`{ ts, gw, data }`), the same layout the worker replays.  |
| `test-team.json`            | The "my entry" whose live overall rank is estimated each frame.                            |
| `manager-distribution.json` | The synthetic manager cohort (compact `{ id, captain, xi }` plus the shared squad).        |
| `expected-curve.json`       | The offline-derived expected overall-rank-at-time-T and the official end-of-gameweek rank. |
| `meta.json`                 | Provenance and the knobs used to generate the bundle.                                      |

## Sampling method

Everything is regenerated deterministically by
`node scripts/generate-recording.mjs --gw=36`. Same inputs in → same artefacts
out, so the committed `expected-curve.json` is reproduced byte-for-byte by the
vitest harness, which recomputes it through the real `@simplyfpl/fpl-client`
functions (`calculateLivePoints` → `estimateLiveRank` via `buildExpectedCurve`).

1. **Squad.** A 15-player synthetic squad (2 GK / 5 DEF / 5 MID / 3 FWD) with a
   `strength` weight per player. Strengths are spread so a few premiums (a 320
   forward, a 300 midfielder) dominate ownership and captaincy, matching the
   shape of a real gameweek.

2. **Manager cohort (~1k).** `buildManagerPool` draws `size` managers from a
   seeded PRNG (`mulberry32`, seed `20260513 + gw`):
   - a formation is picked from a weighted table (3-4-3 and 3-5-2 most common);
   - the keeper, defenders, midfielders and forwards are sampled **without
     replacement**, weighted by `strength + 1`, so stronger players are owned
     more often;
   - the captain is drawn from the XI weighted by `(strength + 1)²`, so premiums
     are captained far more often than fringe players.

   The pool is committed in compact form (`{ id, captain, xi }`) against the
   shared `squad`; `expandManager` rehydrates it to full picks (XI at multiplier
   1, captain 2x, bench at 0) for scoring.

3. **Recording.** 17 frames at 10-minute intervals from `2026-05-13T18:30:00Z`.
   Each player accrues its final gameweek points linearly across a per-player
   minute window (kickoffs are staggered), so partial points build through the
   match and settle once every window closes.

4. **Expected curve.** For each frame, `buildExpectedCurve` scores the test team
   and every manager in the cohort against that frame's live data, takes the
   cohort mean as the live average score, and runs the shipping
   `estimateLiveRank` to produce the expected overall rank. The final frame's
   rank is the `officialEndRank`.

To resize the cohort (1k–10k) or reshape the match, edit the `36` entry in
`GW_CONFIGS` / `POOL_SIZE` in `scripts/generate-recording.mjs` and regenerate.

## Note on the real capture

The full-fidelity cadence capture for a real gameweek (`scripts/capture-gw-recording.mjs`)
is large and stays gitignored. Only this small synthetic bundle is committed, so
CI has a reproducible fixture with no network and no large blobs. The generator's
`--in` mode normalises a real capture into the same `recording.jsonl` layout.
