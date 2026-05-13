# RFC 002 — Rivals View for Mini-Leagues

Status: Draft
Author: Pete
Last updated: 2026-05-12
Workstream slug: `rivals-view`
Depends on: [RFC 001 — Live fan-out](./001-live-fanout.md) (soft — graceful degradation if not yet shipped)

## 1. Goal

Most FPL users don't care about overall rank — they care about beating their mates. The Rivals view zooms a mini-league down to the user's immediate competitors and surfaces the differentials that decide bragging rights.

User-facing outcome (single screen):

- Picks the 3–5 closest rivals to the signed-in user (default: 2 above + 2 below their current league position).
- Per-rival cells show: current GW points (live), captain, active chip, transfers used, bench points wasted.
- A **differentials** panel: players the rival has that you don't (and vice versa), with live points contribution.
- All values update live via the fan-out from RFC 001.

This is the **product wedge**. LiveFPL.net's mini-league view shows the whole league; the user has to scroll to find their rivals. fpl.team locks the equivalent behind a £2–4/mo subscription. We do better on the free tier and gate only the deeper "all rivals + historical EO" view to Pro.

## 2. Current state

- `apps/web/src/components/views/leagues-showcase.tsx` is the existing leagues page (seed data only — wired to `useTrackedLeagues` for the list of leagues, but the standings inside each card are demo data).
- `useTrackedLeagues` (`packages/features/src/leagues/use-tracked-leagues.ts`) reads/writes the `user_leagues` Supabase table.
- `useClassicLeague(leagueId)` exists in `apps/web/src/queries/fpl.ts` and hits `/fpl/leagues-classic/{id}/standings/?page_standings=1`.
- `useEntryPicks(entryId, eventId)` exists but is currently only used for the signed-in user's own team.
- `calculateLivePoints` in `packages/fpl-client` computes live points from picks + live data.
- No rival-picks pre-fetch, no differentials calculator, no rivals UI components.

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Web client                                                          │
│                                                                     │
│  /rivals/[leagueId]/page.tsx                                        │
│    └─ <RivalsView />                                                │
│         ├─ useLeagueStandings(leagueId)    KV-backed, 90s           │
│         ├─ useRivalPicks(rivalEntryIds, gw)  KV pre-warmed          │
│         ├─ useLiveSnapshot(gw)             WS from RFC 001          │
│         └─ buildRivalsBoard()  ── pure, in packages/features        │
└─────────────────────────────────────────────────────────────────────┘
                ▲                          ▲
                │                          │ WebSocket (live snapshot)
                │ HTTP                     │
                │                          │
┌───────────────┴──────────────────────────┴──────────────────────────┐
│ Worker — apps/worker                                                │
│                                                                     │
│  /fpl/leagues-classic/{id}/standings/    KV (existing, 90s)         │
│  /fpl/entry/{id}/event/{gw}/picks/       KV (existing, 2m)          │
│                                                                     │
│  NEW: scheduled() handler — runs cron triggers:                     │
│    - "0 */6 * * *" — refresh tracked leagues' standings             │
│    - 1h after each GW deadline — pre-warm picks for tracked leagues │
│                                                                     │
│  NEW: KV key pattern  `picks:warm:{gw}:{leagueId}` (list of entries │
│         pre-warmed and last-warmed timestamp)                       │
│                                                                     │
│  LiveGwDO  (from RFC 001, unchanged)                                │
└─────────────────────────────────────────────────────────────────────┘
```

The rivals view is **read-only over data already cached**. It piggybacks on RFC 001 for live freshness and on the existing KV proxy for everything else. The only new infra is a **scheduled worker** that pre-warms rival picks at deadline + bootstrap of tracked leagues.

## 4. Data flow

### Pick the rivals

1. Client loads `/rivals/[leagueId]`.
2. Fetch league standings via existing `useClassicLeague` (or rebrand to `useLeagueStandings`).
3. Find the user's entry in the standings (`entryId` is on the profile).
4. Default rival window: signed-in user's rank ± 2 (configurable: 1–10 each side; default 2/2 for the free tier, more for Pro).
5. Resulting `rivalEntryIds: number[]` is typically 4–10.

### Fetch their picks

1. For each `rivalEntryId`, fetch `/fpl/entry/{id}/event/{gw}/picks/` via the Worker (KV-backed, 2m TTL).
2. Picks change at most once per gameweek (at deadline). After bootstrap, KV hits are ~free.
3. **Pre-warm path:** A scheduled worker fires 1h after every gameweek deadline. It walks `user_leagues` (via Supabase service-role read), pulls the top 50 entries of each tracked league, and primes their picks into KV. This makes the rival fetch near-instant on first user view post-deadline.

### Live updates

1. Client subscribes to `LiveGwDO` for the current GW (one WS, same instance everyone shares — see RFC 001).
2. On each snapshot/delta, for each rival, recompute `calculateLivePoints(rivalPicks, liveData, bootstrap)`.
3. Recompute differentials: set-diff between user's `picks` and each rival's `picks`, then attach live points from the same snapshot.

This is all client-side. The DO doesn't know or care about rivalries.

### What the screen renders

For each rival cell (user-row in the middle, highlighted):

- Rank delta (this GW vs last GW) — `live_rank - last_rank`.
- Live GW points + captain + active chip badge.
- Free transfers remaining, hits taken (`event_transfers_cost`).
- Bench points being wasted (`points_on_bench` from `entry_history` — note this is the locked end-of-GW value; for in-flight we compute from the bench picks against live data).

Differentials panel (vs the rival on hover/tap; default: rival immediately above the user):

- **They have / You don't**: players in the rival's starting XI not in yours. Show live points and an "advantage" delta vs your highest-points player at the same position.
- **You have / They don't**: mirror.
- **Captaincy**: their captain vs yours, with live points × multiplier.

## 5. Cloudflare-specific concerns

- **Scheduled workers** (`scheduled()` handler + cron triggers in `wrangler.toml`): the only new piece. Cheap — 1 run per deadline (38 GWs/season) + 1 every 6h.
- **KV writes from scheduled**: bulk pre-warm could write hundreds of keys per league. Each is free up to 1000 writes/day on the paid plan, and we're nowhere near that. Use `ctx.waitUntil` to fire-and-forget.
- **No new DO state.** Rivals view is stateless — the DO doesn't track who's watching what league.
- **FPL rate limits.** The single biggest risk. See §7.

## 6. FPL API endpoints + cadence

| Endpoint                           | Caller | Cadence          | Notes                                                                                                                                  |
| ---------------------------------- | ------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/leagues-classic/{id}/standings/` | Worker | 90 s (KV)        | Existing. May increase to 60s post-RFC-001 if we want it tighter, but standings only change at FT.                                     |
| `/entry/{id}/event/{gw}/picks/`    | Worker | 2 m (KV)         | Existing. Pre-warmed at deadline. After deadline, content is immutable until next deadline — KV TTL could safely be 1h+. Worth tuning. |
| `/event/{gw}/live/`                | DO     | RFC 001 adaptive | Reused.                                                                                                                                |
| `/entry/{id}/`                     | Worker | 5 m (KV)         | Existing. For rank movement and overall ctx.                                                                                           |

## 7. Failure modes + fallbacks

| Failure                                            | Behaviour                                                                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| FPL rate-limits Worker when fetching N rivals      | Mitigated by KV TTL + pre-warm. Worst case: serial fetches with 250ms gap; degraded UX.                                                            |
| Live WS unavailable (RFC 001 unshipped or down)    | Fall back to React Query polling (60s) for live data. Differentials still render, just less fresh.                                                 |
| User isn't in the league (or league is empty)      | Empty state: "Join the league with your team ID to see rivals." Free signup path.                                                                  |
| User's `fpl_entry_id` is unset                     | CTA on the view: "Tell us your team ID first." Already handled by `/settings`.                                                                     |
| Pre-warm scheduled job fails                       | Non-fatal. First view post-deadline pays the on-demand fetch cost (still under 2s for 10 picks).                                                   |
| League is huge (10k+ entries) and user is mid-rank | Standings endpoint is paginated. We need to fetch the right page to find the user — extra round-trip. Worth a helper that binary-searches by rank. |

## 8. Free vs Pro split

Suggested split (calibrated against incumbents — fpl.team gates this entirely, livefpl.net doesn't have it):

| Feature                                                                    | Free | Pro |
| -------------------------------------------------------------------------- | ---- | --- |
| 4 closest rivals (2 above, 2 below)                                        | ✅   | ✅  |
| Live points + captain + chip for each rival                                | ✅   | ✅  |
| Bench points wasted                                                        | ✅   | ✅  |
| Differentials vs the rival immediately above                               | ✅   | ✅  |
| Configurable rival window (e.g. ±5 or top-10)                              | —    | ✅  |
| Differentials vs **all** rivals in one view                                | —    | ✅  |
| Captaincy EO across selected rivals                                        | —    | ✅  |
| Transfer planner overlay against rivals' fixtures                          | —    | ✅  |
| Multi-league rivals dashboard (rivals across all your leagues, one screen) | —    | ✅  |
| Historical: rivals' last-3-GW form                                         | —    | ✅  |

Rationale: free tier is generous enough to undercut paid competitors and become the default place to check this. Pro gates the depth — multi-league, broader window, captaincy EO — which are the things a serious FPL manager _will_ pay for and a casual one won't miss.

## 9. UX considerations

### Web (Next.js)

- New route: `/rivals/[leagueId]` (separate from `/leagues/[leagueId]` standings).
- From `/leagues`, each tracked league card gets a "Rivals" link in addition to "Standings."
- Page composition: ~30–50 LoC per CLAUDE.md guidance; logic in `packages/features/src/rivals/`, components in `packages/ui` (`<RivalCell>`, `<DifferentialsPanel>`).
- Edge runtime where possible; falls back to Node if a transitive Tamagui dep blocks edge (PLAN.md notes this is a known wart on `/rank/[entryId]`).

### Mobile (Expo)

- Out of scope for first slice (post-MVP per project memory).
- The `packages/features/src/rivals/` module must not import from `react-native`/`next`/`expo`. The UI components in `packages/ui` are already Tamagui-cross-platform, so mobile screens can compose them when we get there.

### Integration with existing leagues page

- `LeaguesShowcase` becomes the directory: list of tracked leagues, click into either standings or rivals.
- Long-term the rivals view probably becomes the default and the full standings becomes the secondary view. For v1 they're both first-class.

## 10. Open questions + trade-offs

- **Page-of-standings problem.** For huge leagues, finding the user's row requires fetching the page containing their rank. The FPL endpoint paginates at 50 entries. A user at rank 1234 is on page 25. We can derive the page from `user.last_rank` directly (no search needed) — cheap. But mid-GW rank movement could put them on an adjacent page; we'd need to fetch ±1 pages to be safe. Worth measuring.
- **What if "above" and "below" the user is the same person every GW?** Common in small leagues. The differentials panel becomes repetitive. Mitigation: in leagues <10 entries, just show the whole league as the rivals board. Easy heuristic.
- **EO across rivals.** Computing per-rival captain EO is trivial. Across-all-rivals EO needs a more careful denominator. Defer to a follow-up issue.
- **Pre-warm cost.** Walking every tracked league's top-50 picks at deadline could be tens of thousands of `picks` fetches. Realistic at MVP scale (hundreds of tracked leagues max); not at 100k tracked leagues. We'll cross that bridge later — flag as a scaling concern.
- **Does the user always want their rivals to be by rank?** Some users want a "named rivals" list ("my mates' team IDs"). Easy to add later as a Pro feature.
- **Animation budget.** Per CLAUDE.md design system: subtle, 200ms–1.2s eased. Rivals-board reorders should animate (rank movement is the whole point) but cheaply — a single layout transition, not per-cell springs.

## 11. Non-goals

- Head-to-head leagues (different FPL structure, separate work).
- Cup matchups (defer).
- Push notifications for "you've been overtaken" (Pro feature, separate effort).
- Server-side computation of differentials (keep it client-side; the inputs are already on the client).
- Rivals view for the signed-out user — requires their team ID, so gate behind sign-in or team-ID entry.
