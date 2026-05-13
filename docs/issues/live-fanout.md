# Issues — Workstream: Live Fan-Out

RFC: [001-live-fanout.md](../rfcs/001-live-fanout.md)
Slug: `live-fanout`
Suggested labels: `worker`, `infra`, `feat`, `live-fanout`

Sizes: **S** = ½ day, **M** = 1–2 days, **L** = 3–5 days. Dependencies shown as `↳ blocks: LF-NN`.

---

### LF-01 · Measure FPL `/event/{gw}/live/` real update cadence — **S**

Instrument a one-week observation (script that polls every 5s, logs hashes of the response, plots delta intervals) so we set adaptive polling on data, not guesses. Run during a live match week.

**Acceptance:** A short writeup in `docs/notes/fpl-live-cadence.md` with min/median/p95 interval between observed changes, by match-window state. Confirms or revises the 15s/60s/5min cadences in RFC 001.
**Why first:** Every cadence number in the RFC is a guess until this lands.
↳ blocks: LF-04 (adaptive cadence tuning)

---

### LF-02 · Add Durable Object scaffolding to `apps/worker` — **M**

- New `LiveGwDO` class file in `apps/worker/src/live-gw-do.ts`.
- Update `wrangler.toml` with `[[durable_objects.bindings]]` + SQLite migration (`new_sqlite_classes`).
- Update `Env` interface in `apps/worker/src/index.ts` with the `LIVE_GW: DurableObjectNamespace` binding.
- DO methods: `fetch()` (WS upgrade), `webSocketMessage()`, `webSocketClose()`, `alarm()` — all empty stubs that just log.
- `pnpm --filter @simplyfpl/worker dev` should start successfully with the new binding.
- No real polling logic yet.

**Acceptance:** `wrangler dev` runs; opening `ws://localhost:8787/live/ws?gw=39` connects and stays open. Closing the socket fires `webSocketClose`.
↳ blocks: LF-03, LF-04, LF-05, LF-06

---

### LF-03 · Implement WS upgrade routing in Worker `fetch` — **S**

Route `GET /live/ws?gw=N` to `env.LIVE_GW.idFromName("gw:" + N)` and forward via `stub.fetch(request)`. In the DO `fetch()`, call `state.acceptWebSocket(ws)` (hibernation API), then return `new Response(null, { status: 101, webSocket: client })`.

**Acceptance:** Two browser tabs connect to `/live/ws?gw=39`; both stay connected. The Worker's `Sec-WebSocket-Accept` header and 101 response are correct.
↳ blocks: LF-05
↳ blocked by: LF-02

---

### LF-04 · DO polling loop with diff + adaptive cadence — **M**

- `alarm()` fetches `${FPL_BASE_URL}/event/{gw}/live/` directly (not via KV).
- Diff each `element.stats` against `this.state.storage.get("snapshot")`.
- On change: write new snapshot, also write to `live:gw:{N}` KV key (TTL 60s).
- Compute next-alarm delay from `bootstrap-static` event state + fixtures kickoffs.
- For now, no broadcast — just log diffs.
- Bonus: when all GW fixtures have `finished: true`, do a final fetch and stop scheduling alarms.

**Acceptance:** Local `wrangler dev` shows polling at the cadence dictated by the live GW state. Snapshot in DO storage matches the live FPL response. KV mirror key is updated. With LF-01's data in hand, cadence numbers are calibrated.
↳ blocks: LF-05
↳ blocked by: LF-01 (for cadence tuning), LF-02

---

### LF-05 · WebSocket broadcast of snapshots + deltas — **S**

- On WS open: send `{type: "snapshot", data: <full FplLiveGameweek>, ts}` to the new connection.
- On alarm-detected diff: iterate `state.getWebSockets()` and `ws.send({type: "delta", elements: [...changed], ts})`.
- Handle errors per-socket — one bad socket should not break broadcast.

**Acceptance:** Two tabs subscribed; trigger a manual snapshot mutation; both tabs receive the same delta within ~50ms of each other.
↳ blocks: LF-06, LF-07
↳ blocked by: LF-03, LF-04

---

### LF-06 · Client hook `useLiveSnapshot` with fallback — **M**

- New file `packages/features/src/live-rank/use-live-snapshot.ts`. (Note: `packages/features` is platform-agnostic — use only `WebSocket` global, no `react-native` / `next` / `expo` imports.)
- Opens WS to `${API_URL}/live/ws?gw=N`.
- Merges snapshot + deltas into a single `FplLiveGameweek` shape returned to caller.
- On `onerror` / `onclose` (with N retries failed), falls back to React Query polling via the existing `useLiveGameweek`.
- Auto-reconnect with exponential jitter (1s → 30s cap).
- Exposes a `source: "ws" | "poll" | "loading"` field so the UI can show a "live" pill honestly.

**Acceptance:** Vitest unit test verifies snapshot+delta merge logic. Manual: kill the worker mid-session — hook flips to `poll` source and keeps updating. Restart worker — hook reconnects WS.
↳ blocks: LF-07
↳ blocked by: LF-05

---

### LF-07 · Swap `live-rank-real-view` to use `useLiveSnapshot` — **S**

In `apps/web/src/components/views/live-rank-real-view.tsx`, replace `useLiveGameweek(currentGw)` with `useLiveSnapshot(currentGw)`. The `<LivePill>` reflects the hook's `source` field. No other component changes.

**Acceptance:** `/rank/[entryId]` works identically when WS is up; falls back transparently when worker is killed. Manual stopwatch: data refresh time during a live match is visibly under 5s.
↳ blocked by: LF-06

---

### LF-08 · Telemetry: log broadcast count + connected sockets per alarm — **S**

Cheap structured logs (Workers logs / Tail). Lets us answer "how many concurrent listeners did we have during last weekend's matches?" without building a dashboard.

**Acceptance:** `wrangler tail` shows a JSON log per alarm: `{gw, cadenceMs, changedElements, connectedSockets}`.
↳ blocked by: LF-05 (technically can land alongside)

---

### LF-09 · Smoke test the fallback path in CI — **S**

Playwright test (`tests/e2e/live-fallback.spec.ts`) that:

1. Stubs the WS endpoint to 503.
2. Asserts the page still renders live data within 5s.
3. Asserts the "live" pill shows the polling state, not the WS state.

**Acceptance:** New test green; runs in the existing `pnpm test:e2e` job.
↳ blocked by: LF-07

---

### LF-10 · Document hibernation cost + connected-client ceiling — **S**

After a week of live traffic, write up actual costs in `docs/notes/live-fanout-economics.md`. We need this to answer "can the free tier afford 50k concurrent during a Champions League final," not just guess.

**Acceptance:** A page with: peak concurrent WS, per-day DO duration billed, per-day request count, projected cost at 10× current users.
↳ blocked by: LF-07 + at least one weekend of live data.

---

### Out of scope (filed as future issues, not in this workstream)

- **LF-Future-A** Optimistic match data layer (push from BBC/Opta when FPL is late). See RFC 001 §9.
- **LF-Future-B** Server-side rank distribution sampler (powers `computeLiveRank` stub in `packages/features`). Separate architectural effort.
- **LF-Future-C** Per-region replicated DOs for global latency. Only worth it post-product-market-fit.
- **LF-Future-D** Mobile WS wiring — falls out cheaply once `useLiveSnapshot` exists; will be its own issue when the Expo app is being actively built.

## Suggested order

`LF-01` → `LF-02` (in parallel with LF-01 data collection) → `LF-03` → `LF-04` → `LF-05` → `LF-06` + `LF-08` → `LF-07` → `LF-09` → `LF-10` (passive).
