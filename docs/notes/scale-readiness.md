# Scale-readiness review — 10 → 1M users

**Date:** 2026-07-03  
**Scope:** Survive an overnight Reddit spike (10→1M users) with zero manual intervention.  
**Related:** [#394](https://github.com/pete-watters/simply-fpl/issues/394)

---

## What the architecture gets right

- **O(1) FPL API load** regardless of connected users. `LiveGwDO` polls FPL once per alarm and fans out to all WebSocket clients; adding more users adds zero upstream pressure.
- **Edge-first delivery.** Workers and Pages scale horizontally with no provisioning.
- **Frank weekly is already cheap at any MAU.** One Anthropic call per week, result cached in KV for 10 days; cost is ~$0.009/run = ~$0.47/year regardless of user count.
- **KV caching** on bootstrap-static (1 h), fixtures (10 min), and live GW data (60 s) absorbs 99%+ of FPL API reads.
- **Backoff logic** in `LiveGwDO.alarm()` respects `Retry-After` and exponentially backs off on upstream 5xx/429 so a temporary FPL outage does not cascade.
- **Per-user Frank quota** (soft 50, hard 80/month) already provides partial spend protection.
- **Cohort engine pause flag** (`cohort:pause:fpl` KV key) lets a failing FPL session stop immediately without intervention.

---

## Platform limits table (July 2026)

Sources: [CF KV pricing](https://developers.cloudflare.com/kv/platform/pricing/), [CF DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/), [CF Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Supabase pricing](https://supabase.com/pricing), [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)

### Cloudflare Workers

| Dimension | Free | Paid (Bundled) | Notes |
|---|---|---|---|
| Requests/day | 100k | 10M/mo included, $0.50/M after | Auto-scales; no concurrency cap |
| CPU time/request | 10 ms | 30 ms | Use Unbound billing for longer tasks |
| Memory/invocation | 128 MB | 128 MB | Shared across all in-flight sub-requests |
| Subrequests/request | 50 | 50 | Includes KV ops; snapshot handler uses ~6 |

### Cloudflare KV

| Dimension | Free | Paid |
|---|---|---|
| Reads/day | 100k | 10M/mo included → $0.50/M |
| Writes/day | 1k | 1M/mo included → $5/M |
| Storage | 1 GB | $0.50/GB/month |
| Value max size | 25 MB | 25 MB |
| Key max size | 512 bytes | 512 bytes |
| Min TTL for expirationTtl | 60 s | 60 s |
| Consistency | Eventual (~60 s global lag) | Eventual |

**KV cost at 1M daily users** (worst-case, all making one passthrough request each):

- Rate-limit counters: 2 KV ops/request × 1M = 2M reads + 2M writes/day
- Paid included: 333k reads/day, 33k writes/day
- Overage: ~1.67M reads ($0.84/day) + ~1.97M writes ($9.85/day) = **~$10.69/day = ~$320/month** just for rate-limit KV alone.

This is the hidden KV cost pressure; see hardening item #5.

### Cloudflare Durable Objects (SQLite)

| Dimension | Limit | Notes |
|---|---|---|
| Memory per instance | 128 MB | Shared: snapshot JSON + all WS bookkeeping |
| SQLite storage | ~1 GB practical | No hard published cap |
| Alarm accuracy | ~1 s | One alarm slot per DO; current code is fine |
| WebSocket connections | No hard platform cap | Constrained by 128 MB; code caps at 5,000 |
| Billing: requests | $0.15/M | WS messages billed at 20:1 ratio |
| Billing: compute | $12.50/M GB-s | Duration while CPU is active |

**WebSocket memory estimate** at `MAX_CONNECTIONS = 5,000`:
- FPL live GW payload ≈ 700 players × ~300 bytes = ~210 KB in DO storage
- Hibernating WebSocket overhead: ~1 KB/socket × 5,000 = ~5 MB
- Total per DO instance: ≈ 15–30 MB well within 128 MB

The code cap of 5,000 means a single `gw:N` DO can serve 5,000 concurrent WebSocket clients before returning 503. This is the critical bottleneck.

### Supabase

| Tier | MAU | DB size | Direct connections | Cost |
|---|---|---|---|---|
| Free | **50k** | 500 MB | 60 | $0 |
| Pro | 100k included (+$0.00325/MAU) | 8 GB (+$0.125/GB) | 200 | $25/mo |
| Team | Scaled | Larger | 500+ | $599/mo |

Additional free-tier gotchas:
- Project **pauses after 1 week of inactivity** (not relevant post-launch, but blocks dev branch testing)
- No automated backups on free tier
- Realtime connections: 200 (free), higher on Pro

**PostgREST pool note.** The app uses `@supabase/ssr` and the admin client — all traffic goes via PostgREST (REST API), not raw Postgres connections. PostgREST maintains its own internal pool (~9 connections on free tier). Direct connection count is not the primary bottleneck here, but it becomes relevant if Supabase Realtime or Supavisor pooler is used directly.

### Anthropic (Haiku 4.5)

| | Per million tokens |
|---|---|
| Input | $1.00 |
| Output | $5.00 |
| Batch API | 50% discount |
| Prompt cache (cached read) | ~90% off |

**Frank on-demand cost per ask:**
- Input: ~1,700 tokens (system instruction ~200 + weekly context ~500 + team snapshot ≤4,000 chars ≈ ~1,000 tokens)
- Output: max 512 tokens
- Cost: (1,700 × $1 + 512 × $5) / 1,000,000 ≈ **$0.004/ask**

| Scenario | Asks/month | Monthly cost |
|---|---|---|
| 1k active Ultimate users × 80 asks | 80k | $320 |
| 10k active Ultimate users × 80 asks | 800k | $3,200 |
| 100k active Ultimate users × 80 asks | 8M | **$32,000** |

There is no global daily budget cap or kill-switch in the application today. A viral day is the existential risk.

---

## Choke points (ranked by severity)

### CP-1 — CRITICAL: Supabase free-tier MAU limit (50k)

**File:** `apps/web/src/lib/supabase.ts`, `apps/web/src/lib/supabase-server.ts`

Supabase Free supports 50k monthly active users. Auth for all sign-ins and session refreshes counts against this. At a Reddit spike delivering 50k+ signups in a day, auth starts failing with HTTP 429 for new users — the app becomes unusable for the very audience the spike delivers.

**Trigger:** Upgrade to Pro ($25/mo) at **10k MAU**. There is no automatic upgrade; Pete must do it manually in the Supabase dashboard before the spike arrives. At 100k MAU plan upgrade to Team ($599/mo) or evaluate self-hosted Postgres + GoTrue.

**Manuel action required.** See §Manual work items.

---

### CP-2 — CRITICAL: LiveGwDO single shard (5,000 WebSocket cap)

**File:** `apps/worker/src/live-gw-do.ts:134`, `apps/worker/src/index.ts:379`

All users watching the same gameweek connect to the same Durable Object (`gw:N`). The code hard-caps at `MAX_CONNECTIONS = 5,000` and returns 503 beyond that.

At 100k concurrent live users in GW1, the single DO is exhausted at 5% of target. Every user above 5k gets a 503 and falls back to polling (if implemented) or sees a broken live view.

Even if the cap is removed: one DO instance holds 128 MB of memory. With hibernating sockets the practical ceiling before memory pressure is roughly 50k–100k sockets, but the implementation today hits 5k first.

**Fix needed:** Shard the DO by consistent-hash bucket: route users to `gw:N:shard:M` where M = hash(userId or IP) % SHARD_COUNT. The worker broadcasts a delta to all shards; each shard fans out to its socket subset. Alternatively, push the delta to KV and have each shard poll KV on alarm (simpler, but adds latency).

**Issue filed:** #413

---

### CP-3 — CRITICAL: Anthropic spend — no global kill-switch

**File:** `apps/web/src/app/api/frank/ask/route.ts:130`

Per-user hard quota (80/month) is the only guard. There is no:
- Global daily budget counter
- KV kill-switch flag to disable on-demand Frank globally
- Anthropic Console spend limit set

A viral moment (feature goes viral on Twitter/Reddit, many new Ultimate users sign up and immediately ask Frank) can drain an unset Anthropic budget. At worst-case 100k active Ultimate users × 80 asks × $0.004 = **$32,000/month**.

**Fixes needed (two-layer defence):**
1. Set a hard spend limit in the Anthropic Console now (manual, takes 2 minutes).
2. Add a KV-backed daily Anthropic call counter + `FRANK_KILL_SWITCH` KV key check at the top of `POST /api/frank/ask`. If the daily counter exceeds a configured threshold (`FRANK_DAILY_HARD` env var), return 503 with a `"Frank is resting"` message. Counter resets at UTC midnight.

**Issue filed:** #412

---

### CP-4 — HIGH: Frank monthly quota race condition

**File:** `apps/web/src/app/api/frank/ask/route.ts:123-135`

The current quota check is:
1. `SELECT COUNT(*) FROM frank_queries WHERE user_id = ? AND created_at >= start_of_month`
2. if count ≥ 80, reject
3. make Anthropic API call
4. `INSERT INTO frank_queries`

Steps 1 and 3 are not atomic. A user who fires two concurrent POST requests will both read `count < 80`, both proceed to Anthropic, and both insert — exceeding the hard cap by however many concurrent requests they send.

**Fix needed:** Move the insert to a Supabase RPC/function that increments atomically (e.g. advisory lock or a `frank_quota` counter table with `FOR UPDATE`) or add a short-lived KV lock per user (`frank:lock:<user_id>`) for the duration of the Anthropic call.

**Issue filed:** #415

---

### CP-5 — HIGH: KV-backed rate limiter is eventually consistent

**File:** `apps/worker/src/vs/timed-fetch.ts:64`, `apps/worker/src/index.ts:69`

Rate-limit counters are stored in KV. KV has eventual consistency with up to ~60 s of global staleness. During a sustained burst, multiple edge nodes may read a stale (zero) counter simultaneously, all allow the request, and all write an updated counter — none of which are immediately visible to the others. An attacker can exceed the `PUBLIC_RATE_LIMIT = 120/min` by a factor proportional to the number of CF edge nodes serving the route during the burst.

**Fix needed for high-value endpoints:** Use a Durable Object as the rate-limit store for strongly consistent counting. A single global `RateLimitDO` (or per-IP DO) provides read-after-write consistency that KV cannot. At moderate scale, Cloudflare's own [Rate Limiting product](https://developers.cloudflare.com/waf/rate-limiting-rules/) (WAF layer, no code required) is simpler and more robust.

**Issue filed:** #414 (also covers DO-based rate limiting for correctness)

---

### CP-6 — HIGH: Rivals-warm unbounded Supabase query

**File:** `apps/worker/src/rivals-warm.ts:14`

```ts
const url = `${env.SUPABASE_URL}/rest/v1/user_leagues?select=league_id`;
```

This returns **every row** in `user_leagues` with no `LIMIT`. With 1M users each tracking an average of 3 leagues, that is 3M rows returned per hourly cron tick, each row feeding into a chain of FPL API calls (`leagues-classic/<id>/standings` + per-entry picks for top-50 entries).

At 10k leagues × 50 entries = 500k FPL picks requests per hour — well beyond what FPL allows. The query itself would time out or exhaust the Worker's 30 ms CPU budget long before then.

**Fix needed:**
- Cap the result with `&limit=500` and cycle through pages between cron ticks (cursor-based pagination in KV).
- Or narrow to recently-active leagues: `WHERE updated_at > now() - interval '7 days'`.
- Rate-gate the actual FPL fetches (already 1 `Promise.allSettled` per league — add a concurrency limiter).

**Issue filed:** #417

---

### CP-7 — MEDIUM: Cache stampede on TTL expiry

**File:** `apps/worker/src/index.ts:98` (`fetchWithCache`), `apps/worker/src/snapshot.ts:32` (`getCachedJson`)

When a cached key expires, all concurrent requests that arrive in the same instant miss KV and fan out to FPL simultaneously. For bootstrap-static (1 h TTL) this fires once per hour with potentially thousands of concurrent clients. The FPL API regularly returns 429; a stampede on a cold key will generate a burst of upstream errors and may trigger FPL's per-IP ban.

**Fix needed:** Probabilistic early expiry ("XFetch" / jitter TTL) — before serving a key check if it expires within the next `JITTER_WINDOW_S` seconds; if so, refresh it in `waitUntil` before it actually expires. Alternatively, store a `X-Stale-While-Revalidate` marker in KV so stale data is served immediately and a background task refetches.

**Issue filed:** #416

---

### CP-8 — MEDIUM: Missing rate-limit cover on computed endpoints

**File:** `apps/worker/src/index.ts`

The `enforceRateLimit` call only gates:
- `/status` (10/min/IP)
- `/fpl/*` passthrough (120/min/IP)

The following endpoints have **no rate limiting**:
- `/frank/weekly` — KV read only, low individual cost, but hammerable for free
- `/fpl/prices` — triggers bootstrap re-fetch + price computation on cache miss
- `/fpl/bootstrap-static-slim` — re-fetches FPL on miss
- `/fpl/fixtures-slim` — re-fetches FPL on miss
- `/fpl/leagues/:id/summary` — re-fetches FPL on miss
- `/snapshot/entry/:id` — triggers 3 parallel FPL fetches (bootstrap + entry + picks) on miss

An attacker can hammer `/snapshot/entry/:id` with rotating entry IDs, generating 3 uncached FPL requests per call with no limit.

**Issue filed:** #414

---

### CP-9 — LOW: No spend / error-rate alerts

There are no programmatic spend alerts for any of the three paid services. If Anthropic billing climbs, Cloudflare KV write costs spike, or Supabase MAU approaches the tier limit, Pete will not find out until the invoice arrives or the service degrades.

**Manual actions required.** See §Manual work items.

---

### CP-10 — LOW: DO alarm self-scheduling on first connection (no user-count guard)

**File:** `apps/worker/src/live-gw-do.ts:172`

When the first WebSocket connects to a `gw:N` DO that has no alarm set, it immediately schedules one (`Date.now() + 100 ms`). If a flood of connections arrive simultaneously to a cold DO, each reads `getAlarm() === null` and attempts `setAlarm()` — the last writer wins so the alarm still fires once, but the write contention generates N DO storage writes instead of 1. Not a correctness bug; a minor efficiency issue at connection surge.

This is an existing Cloudflare limitation (no compare-and-set on alarm); not worth code-fixing but worth knowing.

---

## Upgrade triggers

| Threshold | Action | Where |
|---|---|---|
| **Before launch** | Set Anthropic Console spend limit ($50/day to start) | console.anthropic.com → Settings → Billing |
| **Before launch** | Add Frank kill-switch KV flag (code PR) | Issue #TBD |
| **Before launch** | Add rate limit to all worker endpoints (code PR) | Issue #TBD |
| **Before launch** | Set Cloudflare spend alert ($50/month) | dash.cloudflare.com → Billing |
| **Before launch** | Set Supabase budget alert ($30/month) | app.supabase.com → Billing |
| **5k concurrent live users** | Enable DO WebSocket sharding (code must exist first) | deploy config |
| **10k MAU** | Upgrade Supabase to Pro ($25/mo) | app.supabase.com → Settings → Billing |
| **50k MAU** | Plan Supabase Team ($599/mo) or self-hosted Postgres | migration planning |
| **$100/month Anthropic** | Tighten per-user Frank quota or require paid tier | config change |
| **100M KV reads/month** | Review KV cost (~$45/mo overage); consider CDN caching layer | dash.cloudflare.com |

---

## Concrete hardening plan (code changes)

Priority order — implement before August hand-off:

1. **Frank kill-switch + daily budget counter** (`apps/web/src/app/api/frank/ask/route.ts`) — Issue #TBD
2. **DO WebSocket sharding** (`apps/worker/src/index.ts`, `apps/worker/src/live-gw-do.ts`) — Issue #TBD
3. **Rate limits on all worker endpoints** (`apps/worker/src/index.ts`) — Issue #TBD
4. **Frank quota race fix** (`apps/web/src/app/api/frank/ask/route.ts`) — Issue #TBD
5. **Cache stampede protection** (`apps/worker/src/index.ts`, `apps/worker/src/snapshot.ts`) — Issue #TBD
6. **Rivals-warm query pagination** (`apps/worker/src/rivals-warm.ts`) — Issue #TBD

---

## Manual work items for Pete

These cannot be done in code; they require dashboard clicks:

1. **Anthropic Console:** Set a hard spend limit of **€50/day** at `console.anthropic.com → Settings → Billing → Spend limits`. This is the most urgent action — it takes 2 minutes and protects against an unbounded invoice before any code lands.

2. **Cloudflare Dashboard:** Enable a billing alert at $50/month for Workers + KV combined usage at `dash.cloudflare.com → Manage Account → Billing → Notifications`.

3. **Supabase Dashboard:** Set a budget alert at $30/month. Upgrade project to **Pro** when MAU approaches 40k (leave headroom). Path: `app.supabase.com → [project] → Settings → Billing`.

4. **Uptime monitor:** Add `/status` endpoint to an external uptime monitor (UptimeRobot, Better Stack, or Cloudflare Notifications) with email + SMS/push alert. Target: < 5 min MTTD on 5xx. This covers #318.

5. **Anthropic rate limit tier:** Verify the Anthropic account is on a paid usage tier, not the default free tier with 25 req/min. At launch, the Frank weekly cron + any testing could hit this limit. Upgrade via `console.anthropic.com → Settings → Limits`.

---

## Not in scope

- k6 load test script (separate deliverable, issue #394 mentions "one-off")
- Expo / mobile scale (post-launch)
- Cloudflare D1 migration (not in current architecture)
