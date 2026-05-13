# Issues — Workstream: Rivals View

RFC: [002-rivals-view.md](../rfcs/002-rivals-view.md)
Slug: `rivals-view`
Suggested labels: `web`, `feat`, `features-pkg`, `rivals-view`

Sizes: **S** = ½ day, **M** = 1–2 days, **L** = 3–5 days.

---

### RV-01 · Confirm league-standings paging behaviour — **S**

Empirically verify: given a user at overall-league rank R in a mini-league of size N, which page contains them, and is it derivable from `last_rank` without binary search? Note any edge case where mid-GW movement crosses page boundaries.

**Acceptance:** Short note in `docs/notes/fpl-league-paging.md`. Confirms the deterministic page formula or specifies the ±1 fallback.

---

### RV-02 · Pure rivals + differentials engine in `packages/features` — **M**

New module `packages/features/src/rivals/`:

- `compute-rivals-board.ts` — takes user entry + league standings + array of `{entryId, picks, liveData}` + bootstrap. Returns sorted `RivalRow[]` with live points, captain, chip, transfer hits, bench-points-wasted.
- `compute-differentials.ts` — takes two `FplEntryGameweekPicks` + live data. Returns `{theirsOnly, yoursOnly, captaincyDiff}`.
- Unit tests (`*.spec.ts`) covering captain multipliers, chips (TC, BB, FH), and the case where rivals share captains.

Pure TS, no React. No platform imports. Reuses `calculateLivePoints` from `@simplyfpl/fpl-client`.

**Acceptance:** Vitest passes with ≥6 cases covering BB, TC, shared captain, hit deductions, blank GW players, and a 4-rival board with a tied score.

---

### RV-03 · Multi-entry picks hook — **M**

`packages/features/src/rivals/use-rival-picks.ts`: takes `entryIds: number[]` + `gw`, returns `{ data: Map<number, FplEntryGameweekPicks>, isLoading, error }`. Internally fans out N parallel React Query calls with `useQueries`. Reuses the existing `/fpl/entry/{id}/event/{gw}/picks/` endpoint via the worker (KV cache hit after first load).

**Acceptance:** With 8 rival IDs, hook returns within 500ms on warm KV. Cold KV: <2s. Failures on one entry don't block the others.

---

### RV-04 · Rivals view route + UI composition — **M**

- New route: `apps/web/src/app/rivals/[leagueId]/page.tsx` (~30–50 lines, edge runtime if possible).
- New view: `apps/web/src/components/views/rivals-view.tsx` — composes `<RivalCell>`, `<DifferentialsPanel>` from `packages/ui`, with empty/loading/error states.
- New UI components in `packages/ui/src/components/rival-cell/` and `.../differentials-panel/`. Cross-platform Tamagui only.
- Wires `useLeagueStandings`, `useRivalPicks`, and (if RFC 001 has shipped) `useLiveSnapshot`. If not shipped, fall back to `useLiveGameweek`.

**Acceptance:** Visit `/rivals/<some-league>` while signed in with a team ID set — see your own row highlighted with 2 rivals above and 2 below. Captains render with `(C)` and `(TC)` where applicable.
↳ blocked by: RV-02, RV-03

---

### RV-05 · Default rival-window heuristic for tiny leagues — **S**

If `league.standings.results.length <= 8`, render the whole league as the rivals board (don't show "2 above, 2 below" with redundant gaps). Pure logic change in `compute-rivals-board.ts` or in the view.

**Acceptance:** A 6-entry league renders all 6 cells, user highlighted.
↳ blocked by: RV-02

---

### RV-06 · Link rivals view from existing leagues page — **S**

In `LeaguesShowcase`, each tracked league card gets a "Rivals" button alongside the existing standings affordance.

**Acceptance:** From `/leagues`, click "Rivals" on any tracked league → land on `/rivals/[leagueId]`. Back button returns to `/leagues`.
↳ blocked by: RV-04

---

### RV-07 · Scheduled pre-warm worker — **M**

- Add `scheduled()` handler in `apps/worker/src/index.ts`.
- Cron in `wrangler.toml`: 1h after each weekly GW deadline (or a fallback cron that runs every hour and checks if a deadline-passed condition holds, since GW deadlines aren't on a fixed weekly schedule).
- Fetches tracked leagues from Supabase (service-role read on `user_leagues`).
- For each league, fetch top-50 entries, prime their picks into KV (fire-and-forget `ctx.waitUntil`).
- Writes a `picks:warm:{gw}:{leagueId}` marker key with timestamp.

**Acceptance:** Trigger locally with `wrangler dev --test-scheduled` — KV inspector shows picks keys for the top entries of each tracked league. No timeouts. Idempotent across reruns.
↳ Soft dep on RV-04 — not blocking, but the value of pre-warming only matters once users hit the view.

---

### RV-08 · Pro gate for "configurable window + multi-league rivals dashboard" — **S**

Wire the suggested split from RFC 002 §8 against `useSubscription()` (existing placeholder in `packages/features/src/subscriptions`). Free tier locks the window to ±2; Pro can pick ±1 to ±5 or "top 10."

**Acceptance:** Toggle the user's `is_pro` in Supabase → window selector becomes interactive. Without Pro, the selector shows an upgrade hint instead of the controls.
↳ blocked by: RV-04. Soft dep on `subscriptions` module having a real `useSubscription()` (might land in parallel from another workstream).

---

### RV-09 · Animate rank movement in the rivals board — **S**

Single layout transition when a rival overtakes another. 200–400ms eased. Don't over-do it.

**Acceptance:** Trigger a manual live snapshot in dev that reorders the rivals — animation is visible, not jarring, and respects `prefers-reduced-motion`.
↳ blocked by: RV-04

---

### RV-10 · Unit-test the Pro/free behaviour with a stub auth provider — **S**

Vitest using a stub `AuthProvider` from `packages/features/src/auth`. Snapshot the rivals board with and without `is_pro`.

**Acceptance:** Two test cases pass. CI runs them in `pnpm test:unit`.
↳ blocked by: RV-08

---

### Out of scope (filed as future)

- **RV-Future-A** "Named rivals" feature (track-specific-people-by-team-ID, regardless of league rank). Pro feature.
- **RV-Future-B** Captain EO across all selected rivals. Trivial extension once RV-02 lands.
- **RV-Future-C** Push notifications on overtakes. Separate Pro feature, separate workstream.
- **RV-Future-D** Head-to-head league support — different FPL structure, different RFC.

## Suggested order

`RV-01` (parallel) → `RV-02` → `RV-03` → `RV-04` → `RV-05` + `RV-06` + `RV-09` (parallel) → `RV-07` (parallel from start) → `RV-08` → `RV-10`.
