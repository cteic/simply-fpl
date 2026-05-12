# Competitive-Differentiation Workstreams — Index

Three workstreams that take SimplyFPL from "viable MVP" to "credibly better than livefpl on the dimensions that matter":

| Workstream                                            | RFC                                                        | Issues                                       | Wedge     |
| ----------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- | --------- |
| **Live data fan-out** via Cloudflare DOs + WebSockets | [001-live-fanout.md](../rfcs/001-live-fanout.md)           | [live-fanout.md](./live-fanout.md)           | Technical |
| **Rivals view** for mini-leagues                      | [002-rivals-view.md](../rfcs/002-rivals-view.md)           | [rivals-view.md](./rivals-view.md)           | Product   |
| **Speed-comparison landing page** at `/vs-livefpl`    | [003-speed-comparison.md](../rfcs/003-speed-comparison.md) | [speed-comparison.md](./speed-comparison.md) | Marketing |

The point of this triple is: the **technical** improvement gives us a thing to brag about, the **product** improvement gives users a reason to switch, and the **marketing** artefact ties the two together for distribution.

## Cross-workstream dependency graph

```
LF-01 (measure cadence) ─┐
                         │
LF-02 ─► LF-03 ─► LF-04 ─┴─► LF-05 ─► LF-06 ─► LF-07 ─► LF-08, LF-09, LF-10
                                                  │
                                                  │ soft: provides useLiveSnapshot
                                                  ▼
RV-01 (paging)                              ┌──────────┐
RV-02 (pure engine)                         │ RV-04    │
RV-03 (rival picks hook) ──► ───────────────►  view    │ ─► RV-05, RV-06, RV-08, RV-09
RV-07 (scheduled pre-warm) ─►   (parallel)  └──────────┘ ─► RV-10

SC-01 (feasibility) ─► SC-02 ─► SC-03 ─► SC-04 ─► SC-05 ─► SC-06 ─► SC-07
                                                                ╲
                                                                 ─► SC-09 (legal — public-launch gate)
                  ╲
                   ─► SC-08 (only if SC-01 verdict is "no Browser Rendering")
```

Hard cross-stream deps:

- `RV-04` (rivals view) **soft-depends on `LF-06`** (`useLiveSnapshot`). The rivals view ships without it (falls back to React Query polling); but the _demo_ — what we'd show the co-marketer — only sings once both have landed.
- `SC-06` (landing page) **soft-depends on a measurable lead over livefpl**, which exists only after `LF-07` ships and we've measured. Don't publish the comparison page before the win is real.

No hard locks between RV and SC.

## Suggested execution order (2–3 calendar weeks of focused work)

**Week 1 — measurement + scaffolding (do these in parallel):**

- LF-01 (cadence measurement — passive observation, runs in background)
- SC-01 (Browser Rendering pricing + livefpl headers)
- RV-01 (paging behaviour)
- LF-02 (DO scaffolding) — first real code

These four are all small. Get the open questions answered before anything else commits.

**Week 2 — the technical wedge:**

- LF-03 → LF-04 → LF-05 → LF-06 → LF-07
- In parallel: RV-02 (pure engine, no deps on live fan-out)
- In parallel: SC-02 → SC-03 (or SC-08 if SC-01 says no-go)

By end of week 2, `/rank/[entryId]` is visibly faster than livefpl and the rivals engine has passing tests.

**Week 3 — product + marketing:**

- RV-03 → RV-04 → RV-05/06/09 (in parallel)
- RV-07 in parallel from the start of the week (pre-warm runs independently)
- SC-04 → SC-05 → SC-06 → SC-07 → SC-09

End-state demo for the co-marketer: open `/rank/X` (fast), open `/rivals/Y` (genuinely useful, live), open `/vs-livefpl` (numbers prove it).

## What we are deliberately _not_ doing in this triple

- **No mobile work.** Expo app stays where MVP left it. Once the web product is real, mobile is a port — Tamagui components are already cross-platform, `packages/features` already platform-agnostic.
- **No optimistic match-data layer** (BBC/Opta push-ahead of FPL). RFC 001 §9 flagged it as a follow-up; do it only when we've measured that FPL's `/event/live/` is slow enough during goal scoring to matter.
- **No server-side live rank estimation.** `computeLiveRank` stays a stub; the DO ships raw data, not estimates. Rank estimation is a separate, harder problem.
- **No new auth, payments, or settings work.** Those are pre-launch MVP polish; the three workstreams here are post-launch differentiators.

## How to ship this

- One branch per issue (`feat/lf-02-do-scaffold`, etc), PR to `dev` (per project convention).
- Each PR uses `Closes #N` per [PR-issue linking memory](../../../.claude/projects/-Users-peterwatters-src-simply-fpl/memory/feedback_pr_issue_linking.md).
- Commit + PR style per [output style preferences](../../../.claude/projects/-Users-peterwatters-src-simply-fpl/memory/feedback_output_style.md) — terse, no auto-summaries, no co-author trailer.
- Verification is enforced by CI (`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build`). The husky pre-commit gotcha noted in CLAUDE.md applies — `pnpm format && git add -u` before every commit.
- Don't open the issues until you've actually read the RFC and the issue list. The estimates are calibrated assuming you understand the architecture in the RFC — without that, sizes will lie.
