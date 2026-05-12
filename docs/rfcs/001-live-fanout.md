# RFC 001 — Live Data Fan-Out via Durable Objects

Status: Draft
Author: Pete
Last updated: 2026-05-12
Workstream slug: `live-fanout`

## 1. Goal

When the FPL `/event/{gw}/live/` endpoint emits new data, every connected SimplyFPL client (web + mobile) sees the change in **~1s**, not 30–90s. This is the headline technical differentiator versus livefpl.net (per-client polling) and livefpl.com (slower server-side polling). It also drops the per-user cost of live mode close to zero — one upstream poller serves all viewers of an active gameweek.

User-facing outcome:

- Live rank, live points, and live mini-league movement update visibly faster than competitors during match windows.
- "Live" pill in the UI is honest — when it shows a heartbeat, the data is genuinely fresh.
- Idle cost stays low: no waste between match days.

## 2. Current state (what's already there)

- `apps/worker` is a pure `fetch`-handler Worker. It proxies `/fpl/*` to `fantasy.premierleague.com/api/*` and caches in `FPL_CACHE` KV with TTLs (60s for `/live/`, 1h for `/bootstrap-static/`, 90s for leagues, 2m for entry picks).
- No Durable Objects. `wrangler.toml` has only a KV binding.
- Web clients (`apps/web/src/queries/fpl.ts`) hit the Worker via React Query, with `refetchInterval: 60_000` for live + picks, `90_000` for league standings.
- `packages/fpl-client` is a pure TS HTTP client that targets `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8787`).
- Mobile (`apps/mobile`) is scaffolded but not wired to the API. Out of scope for this RFC's first slice.

Effective worst-case freshness today: 60s (KV TTL) + up to 60s (client polling drift) = **~120s** in the bad case. Best case is 60s.

## 3. Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                Cloudflare Worker — apps/worker                    │
│                                                                   │
│  fetch handler  (existing)                                        │
│   /fpl/*  ──► KV cache ──► FPL API   (unchanged, fallback path)   │
│                                                                   │
│  /live/ws?gw=N  ──► routes to LiveGwDO (id = "gw:N")              │
│                                                                   │
│  Durable Object: LiveGwDO  (one instance per active gameweek)     │
│   ┌─────────────────────────────────────────────────────────┐     │
│   │ alarm() ── poll FPL /event/{gw}/live ──► diff vs state  │     │
│   │   ├─ store snapshot in this.state.storage               │     │
│   │   ├─ broadcast delta to all WebSockets (hibernated OK)  │     │
│   │   └─ schedule next alarm (15s / 60s / 300s adaptive)    │     │
│   │ webSocketMessage() ── client→server (subscribe/ping)     │     │
│   │ webSocketClose() ── hibernation API drops idle conns    │     │
│   └─────────────────────────────────────────────────────────┘     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
        ▲                                       ▲
        │ HTTP fallback                         │ WebSocket
        │                                       │
   ┌────┴───┐                              ┌────┴────────────┐
   │ Worker │                              │ Web (Next.js)   │
   │ /fpl/* │                              │ Mobile (Expo)   │
   └────────┘                              └─────────────────┘
```

Key invariants:

- **One DO per active gameweek.** ID = `gw:{eventId}`. The DO is the single point of upstream polling for live data. Not one per league, not one per user — that would defeat the fan-out advantage.
- **Picks stay in KV.** The DO only broadcasts the raw live snapshot (`FplLiveGameweek`). Per-entry picks change once at deadline and are cached separately. Clients compute their own points locally using `calculateLivePoints` from `@simplyfpl/fpl-client`. This keeps the DO stateless w.r.t. users.
- **Hibernatable WebSockets.** Use `state.acceptWebSocket(ws)` (the hibernation API), not `ws.accept()`. Idle connections stop billing CPU and the DO can evict itself when no events are firing.
- **Adaptive polling.** Alarm cadence based on what `bootstrap-static` says about the gameweek (deadline + match kickoffs).

## 4. Data flow

### Client connect

1. Client opens `wss://worker.simply-fpl.workers.dev/live/ws?gw=39`.
2. Worker `fetch` handler upgrades and forwards to `LiveGwDO("gw:39")` via `state.acceptWebSocket(ws)`.
3. DO immediately sends the cached latest snapshot (`{type: "snapshot", data: FplLiveGameweek, ts}`) so the client has data without waiting for the next poll.
4. Subsequent updates arrive as `{type: "delta", elements: [...changed FplLiveElement], ts}` — only the players whose stats changed.

### DO polling loop

1. `alarm()` fires.
2. DO fetches `${FPL_BASE_URL}/event/{gw}/live/`. (Direct, not through the KV cache — KV would defeat freshness.)
3. Diffs each `element.stats` against the in-storage snapshot. If unchanged, broadcast nothing and reschedule.
4. If changed, write new snapshot, broadcast delta to all WebSockets, also write `live:gw:{N}` to KV (so the HTTP fallback path is current too).
5. Schedule next alarm.

### Polling cadence (adaptive)

Derived once per alarm from `bootstrap-static.events[gw]` and `fixtures[gw]`:

| State                                    | Cadence              |
| ---------------------------------------- | -------------------- |
| Match in progress (any fixture, 0–120 m) | **15 s**             |
| Match window starts in <30 m             | 30 s                 |
| Within 2h of FT but bonus not yet locked | 60 s                 |
| Gameweek live but no active match        | 5 min                |
| Gameweek not live (deadline > 1h away)   | 30 min               |
| Gameweek finished and bonus locked       | DO sleeps (no alarm) |

The DO checks fixture kickoffs from a snapshot it pulls once per alarm (cheap KV read of `bootstrap-static`). When it sleeps, no cost.

### Bonus + BPS

These two are subtle and worth calling out:

- `bps` updates **with every event** during a match — already covered by the 15s cadence.
- `bonus` is **provisional mid-match** (FPL recalculates frequently) and **locked at full-time**. The provisional value shows up in `element.stats.bonus` once FPL begins computing it.
- The diff loop treats `bonus` as just another stat — when it changes, broadcast. UI marks bonus as `provisional` until `is_bonus_added_in_lineups` (or equivalent — needs measurement, see open questions).
- One additional alarm trigger: when all fixtures for the GW have `finished: true`, do a final fetch to capture locked bonus, then sleep.

## 5. Cloudflare-specific concerns

### DO binding (wrangler.toml change)

```toml
[[durable_objects.bindings]]
name = "LIVE_GW"
class_name = "LiveGwDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["LiveGwDO"]
```

Use the **SQLite-backed** DO class (`new_sqlite_classes`, not `new_classes`). SQLite DOs are the default going forward, are cheaper for small KV-style use, and are required for some newer storage APIs.

### Hibernation

Use the Hibernatable WebSocket API:

- `state.acceptWebSocket(ws, tags?)` — connection survives DO eviction
- `webSocketMessage(ws, message)` / `webSocketClose(ws, code, reason, wasClean)` — handlers fire even after hibernation
- `state.getWebSockets()` — iterate live + hibernated connections to broadcast

This is the difference between "1000 cheap idle connections" and "1000 connections each billing CPU." Critical for freemium economics.

### Regional placement

Set `placement = { mode = "smart" }` for the Worker so that for users in a region with no nearby colo, requests still benefit from CF's heuristics. The DO itself lives in one colo per instance (CF picks based on first-write region) — fine for our use case since the FPL API is in the UK and most of our users are too.

### KV vs DO

| Concern            | Where it lives | Why                                                                                                                   |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| Live GW snapshot   | DO storage     | DO is the writer; KV is a follower for HTTP fallback                                                                  |
| Bootstrap-static   | KV (1h TTL)    | Read-heavy, no fan-out value                                                                                          |
| Entry picks        | KV (2m TTL)    | Per-user, low write rate                                                                                              |
| League standings   | KV (90s TTL)   | Per-league, computed for free tier                                                                                    |
| **Mirror of live** | KV (60s TTL)   | The DO writes to KV after each broadcast so non-WS clients (and the existing React Query path) keep working unchanged |

### Cost shape (rough)

- DO requests: 1 alarm fire per cadence step. At 15s for ~4h match windows + 5m for the rest of GW → ~1000 alarms per GW. Negligible.
- DO duration: hibernation keeps idle ms near zero. Charge ≈ poll-and-broadcast wall time × cadence.
- WebSocket messages: one delta per change × N connected clients. Worst case ~20 deltas/min × 5000 connections = 100k messages/min, well under the 10k/sec/instance soft limit.

Honest uncertainty: I haven't measured what "5000 connected clients" actually costs on the SQLite DO billing model. Flag for the prereq issue (`LF-01`).

## 6. FPL API endpoints + cadence

| Endpoint                           | Polled by | Cadence                        | Notes                                                 |
| ---------------------------------- | --------- | ------------------------------ | ----------------------------------------------------- |
| `/event/{gw}/live/`                | DO        | 15 s / 60 s / 5 min (adaptive) | The hot path. Direct fetch, never through KV.         |
| `/bootstrap-static/`               | Worker    | 1 h (KV TTL)                   | DO reads it to compute cadence — cheap KV hit.        |
| `/fixtures/?event=N`               | Worker    | 10 min (KV TTL)                | DO reads it to know match kickoffs.                   |
| `/entry/{id}/event/{gw}/picks/`    | Worker    | 2 m (KV TTL)                   | Unchanged. Per-user, low write rate.                  |
| `/leagues-classic/{id}/standings/` | Worker    | 90 s (KV TTL)                  | Unchanged for now. Rivals view (RFC 002) will adjust. |

**Honest uncertainty:** I don't know empirically how often FPL actually updates `/event/{gw}/live/`. The 60s TTL we currently use is a guess. The 15s adaptive cadence is also a guess — it could be wasted requests if FPL only updates every 30s upstream. **Prereq issue (`LF-01`)**: instrument a one-week measurement before tuning cadence.

## 7. Failure modes + fallbacks

| Failure                                    | Behaviour                                                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| DO unreachable (CF outage, region failure) | Client WS reconnect fails → falls back to existing React Query polling via `/fpl/*`. No UI change needed.                               |
| FPL API 5xx                                | DO retries with exponential backoff (1s, 2s, 4s, 8s cap). Stale snapshot served to new connections.                                     |
| FPL API rate-limits the DO                 | DO honours `Retry-After`. Worth measuring — DOs egress from CF IPs, which FPL may treat differently than residential. Flag for `LF-01`. |
| WebSocket dies on client                   | Client auto-reconnects with jitter (1s → 30s cap). On reconnect, server sends fresh snapshot.                                           |
| DO storage corruption                      | DO rehydrates from a fresh `/event/{gw}/live/` fetch on first alarm. No persistent state is irreplaceable.                              |
| Browser blocks WS (corp proxy, etc.)       | React Query polling path still works — degraded but functional.                                                                         |

The DO is **optional, not load-bearing**. Every feature that uses it must work (slower) without it. The existing `/fpl/*` cache path is the safety net.

## 8. Client integration

Web (`apps/web`):

- New hook in `packages/features/src/live-rank/use-live-snapshot.ts`:
  - Opens WS via `EXPO_PUBLIC_API_URL`/`NEXT_PUBLIC_API_URL` (`/live/ws?gw=N`).
  - Falls back to existing `useLiveGameweek` polling on connect failure or after 3 reconnect attempts in a row.
  - Returns the same `FplLiveGameweek` shape so callers don't care which path delivered it.
- `live-rank-real-view.tsx` swaps `useLiveGameweek(currentGw)` for `useLiveSnapshot(currentGw)` — one-line change.

Mobile (`apps/mobile`): same hook, no platform-specific code (WebSocket is global in both React Native and the browser). Out of scope for the first slice but the shape is mobile-ready.

## 9. Open questions + trade-offs

- **15s is aggressive.** If FPL actually updates every 30–60s, we're wasting half the fetches. We'd see this in the measurement issue. Cheap to tune later.
- **One DO per GW worldwide is fine for launch, not for global scale.** CF colos the DO once. If we ever hit serious latency from Asia/US users we'd need read-replicated DOs or per-region DOs — non-trivial. Not for now.
- **Auth on WS endpoint.** Anonymous for v1. If we want to gate live WS to signed-in users (or rate-limit free tier), we'd verify a Supabase JWT in `fetch` before upgrading. Easy to bolt on.
- **What counts as a "delta"?** Per-player diff is obvious. Do we also diff `explain` arrays (the breakdown per fixture)? Yes — but they're chunky. Worst case payload per delta during a goal: ~5 elements × ~500 bytes JSON = 2.5kB. Fine.
- **Optimistic match-data layer (BBC/Opta).** Flagged for a follow-up. The DO architecture makes this trivial to add later — push a second event type `{type: "optimistic", elements: [...]}` from a different upstream source. **Do not build this now.** The FPL-only fan-out is the win for v1; bolting on a second data source before the first is measured would be premature.
- **DO storage migration if we change snapshot shape.** Cheap — snapshots are disposable. Version a `schemaVersion` field so a stale snapshot just triggers a fresh fetch.
- **Compute live rank server-side?** The stub `computeLiveRank` in `packages/features/src/live-rank/compute-rank.ts` wants a rank distribution. That's a separate, much harder problem — sampling top-N managers to estimate "where does X points put you in the overall ranks." Out of scope for this RFC. The DO ships raw live data; rank estimation is a later, independent piece of work.

## 10. Non-goals

- Optimistic updates from non-FPL data sources (follow-up).
- Server-side live rank estimation (separate effort).
- Mobile WS wiring (will fall out for free once the hook lands; not blocking).
- Per-league DOs (defeats the point).
- Backfilling historical gameweeks (use KV).
