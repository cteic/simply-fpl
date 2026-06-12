# LiveGwDO — hibernation cost model + connected-client ceiling

Related: RFC 001 §5 cost shape, issue #81 (LF-10)
Last updated: 2026-06-12

## Status

Pre-launch. No production traffic data yet. All figures are projections from the
GW36 single-match measurement (see `docs/notes/fpl-live-cadence.md`) and Cloudflare
Workers Paid billing model.

---

## (a) Hibernation triggers + duration

`LiveGwDO` uses the **hibernatable WebSocket API** (`state.acceptWebSocket(server)` at
`apps/worker/src/live-gw-do.ts:143`). Under this API:

- The DO is **awake only while an event handler is actually running** — i.e. during an
  `alarm()` callback or a `webSocketMessage()` callback.
- Between alarm fires the DO hibernates fully, even if thousands of WebSocket connections
  are open. Hibernated connections are tracked by the CF runtime, not by the DO CPU.
- Hibernation is triggered automatically. There is no manual sleep call; the DO simply
  exits `alarm()` and CF suspends it until the next alarm fires.

Typical awake window per alarm fire:

| Phase                    | Awake time (estimate)        |
| ------------------------ | ---------------------------- |
| HTTP fetch to FPL        | ~50–150 ms                   |
| Snapshot diff + JSON     | ~5–20 ms                     |
| Broadcast to N sockets   | ~1 ms per 1 k connections    |
| **Total per alarm fire** | **~100–300 ms at 5 k conns** |

At the 5 s match cadence this gives a duty cycle of roughly **2–6 %** during active
play. Between match windows (120 s or 300 s cadence) duty cycle drops below 0.1 %.

---

## (b) Cost per active connection per hour

### Duration billing

Duration billing stops the moment `alarm()` returns. With the numbers above:

| Cadence    | Alarms/hr | Awake ms/hr (@ 300 ms each) | Active compute |
| ---------- | --------: | --------------------------: | -------------- |
| 5 s match  |       720 |                       216 s | 6 %            |
| 120 s idle |        30 |                         9 s | 0.25 %         |
| 300 s off  |        12 |                       3.6 s | 0.1 %          |

CF charges duration at ~$12.50 per million GB-s (128 MB = 0.125 GB per DO instance).

- 1 GW (4 h match + 2 h idle) total active time ≈ 216 s × 4 + 9 s × 2 ≈ **882 s ≈ 15 min**
- Duration charge per GW: 882 s × 0.125 GB × $0.0000000125/GB-s = **~$0.000001 per GW**
- Monthly (4 peak GWs): **< $0.00001 — effectively zero**

**Cost per idle hibernated connection = €0.** The connection count has no effect on
duration billing.

### Request / WebSocket message billing

Each WS message broadcast counts as one DO request. CF charges $0.15 per million
requests beyond the free 1 M/month on Workers Paid.

From the GW36 measurement: **87 delta broadcasts** during one 2 h single-match GW.
Scaling to a typical 10-match GW weekend: ~870 total deltas.

| Concurrent viewers | Messages / GW | Messages / month (4 GWs) | Beyond 1 M free | Cost/month |
| -----------------: | ------------: | -----------------------: | --------------: | ---------: |
|                100 |          87 k |                    348 k |               0 |  **$0.00** |
|              1,000 |         870 k |                   3.48 M |          2.48 M |  **$0.37** |
|              5,000 |        4.35 M |                   17.4 M |          16.4 M |  **$2.46** |
|             10,000 |         8.7 M |                   34.8 M |          33.8 M |  **$5.07** |

These estimates use the lower bound of 87 deltas/match from the single-match measurement.
A multi-match GW with BPS churn could plausibly produce 3–5× more deltas.

---

## (c) Measured connection counts during live GWs

**None yet.** Pre-launch as of 2026-06-12.

The GW36 soak (2026-05-13) measured FPL upstream update cadence from a single probe
script — it established 0 concurrent WebSocket viewers, not real user traffic.

The DO logs every accept and close:

```
LiveGwDO[gw:N]: ws accepted (connected=X)
LiveGwDO: event=alarm gw=N connected=X broadcasted=Y
```

After launch, Cloudflare Dashboard → Workers Analytics → Durable Objects will show
request counts per day. The `alarm` log lines are the cheapest proxy for peak
concurrent until proper metrics land.

---

## (d) Theoretical ceiling before cost becomes meaningful

### Code ceiling (hard)

`MAX_CONNECTIONS = 5000` at `live-gw-do.ts:134`. Connections 5,001+ receive a 503.
This is the effective ceiling today — **cost is not the binding constraint**.

### Cost ceiling

At 5,000 concurrent viewers the estimated monthly bill is ~$2.50 above the Workers
Paid $5/month base. That's 50 % overhead but still single-digit dollars. Cost becomes
meaningful (≥ $10–20/month add-on) at roughly **20,000–40,000 concurrent viewers** —
well above the code ceiling and far above any realistic pre-season-launch audience.

If MAX_CONNECTIONS is raised or multiple DO instances are sharded per GW:

- First real cost pressure appears around **10 k concurrent live-rank viewers**
  (~$5/month additional)
- At 50 k concurrent (the "Champions League final" worst case from #81) costs would
  be ~$50/month, assuming sharding across ~10 DO instances at 5 k each — still
  viable for a paid service

### DO instance request-rate ceiling

The CF soft limit is 10,000 WebSocket messages per second per DO instance. At 5 s
cadence with ~20 deltas/broadcast to 5,000 sockets: 100 k messages per 5 s = 20 k
messages/s — **just above the soft limit**. Practical mitigation: stagger broadcasts
in small batches within `alarm()`, or accept the soft-limit throttle (CF queues rather
than drops). The hard rate limit is much higher and requires contacting CF.

---

## (e) Action summary

**No action needed until ~10 k concurrent live-rank viewers.**

The current binding constraint is the 5 k hard cap in `live-gw-do.ts:134`, not cost.
Raise `MAX_CONNECTIONS` when the waitlist reaches that threshold, then revisit the
cost table above. Sharding (multiple DO instances per GW) is the scaling path beyond
one instance, but that's a meaningful engineering effort with its own trade-offs — do
not build it speculatively.

Revisit this document after the first real GW with production traffic, filling in the
measured peak concurrent, per-day DO duration, and per-day request count from CF
Dashboard. The log lines below can be grepped from Worker tail logs to get a quick
read:

```
LiveGwDO: event=alarm … connected=X broadcasted=Y
```
