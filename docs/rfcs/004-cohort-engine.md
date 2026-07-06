# RFC 004 — Cohort Engine

Status: Draft
Author: Claude (drafted on behalf of Pete)
Last updated: 2026-05-14
Workstream slug: `cohort-engine`
Depends on: RFC 001 — Live fan-out (soft; the Helpers/Hurters live widget downstream needs LF-04+, but the cohort engine itself does not).

## 1. Goal

LiveFPL.net's killer feature is **cohort benchmarks**: "X% of Top 10k own Salah", "off Top10k by 6.4 pts", "Helpers/Hurters this round". The FPL API does not expose these directly — LiveFPL builds them by fetching the picks of every manager in the global ranks it cares about (Top 10k, Top 100k, Overall) each gameweek and aggregating client-side.

SimplyFPL needs the same dataset. Four launch-aligned product surfaces depend on it:

1. **Stats table**: You vs Top10k / Overall / Legendary cohorts — avg points, captain pick rate, top transfers in/out.
2. **Rank details**: Off Top10k, Off 25K, Safety pts, Pre-/post-subs differential.
3. **Helpers/Hurters live widget** (also needs RFC 001's LF-04+ live snapshot loop — out of scope here).
4. **Per-player Top10k ownership %** (separate from the global `selected_by_percent` already on bootstrap).

This RFC defines the **cohort engine**: how we fetch, aggregate, and serve cohort-tier ownership/captain/transfer stats. It is the unblocking dependency for surfaces 1, 2, 4. Surface 3 also needs RFC 001 to land.

User-facing outcome (single sentence): every player card and rank screen surfaces "vs Top10k" data within seconds of the GW finishing, and (with cron tuning) within minutes during a live GW.

## 2. Current state

- `apps/worker/src/index.ts` is a thin FPL proxy with KV caching. No scheduled handler yet.
- `apps/worker/src/live-gw-do.ts` is the RFC 001 Durable Object (live fan-out — separate concern).
- `apps/worker/wrangler.toml` has no `[triggers]` block. KV (`FPL_CACHE`) and DO (`LIVE_GW`) bindings exist.
- Supabase has two tables only: `profiles`, `user_leagues` (see `supabase/migrations/0001_init.sql`). No analytics tables.
- `packages/types/src/db.ts` mirrors the Supabase schema. Adding new tables requires updating both.
- The web app already surfaces global `selected_by_percent` via bootstrap-static (`packages/types/src/index.ts:12`) — this is FPL's overall ownership, **not** cohort-specific.
- Head-to-head (#107/#108) is separate and shipped.

We have **two gameweeks of testing** (GW37 + GW38, then season ends) before launch (GW1, August 2026). Foundations this weekend, testing across GW37/38 — anything that hasn't behaved across those two real GWs we should treat as unproven.

## 3. Architecture overview

```
┌───────────────────────────────────────────────────────────────────────┐
│ Cloudflare Worker — apps/worker                                       │
│                                                                       │
│  scheduled(event, env, ctx)                                           │
│    cron: "*/10 * * * *"   live-GW mode                                │
│    cron: "0 */6 * * *"    idle mode                                   │
│                                                                       │
│  cohort.ts                                                            │
│    ├─ pickCronMode(gw, deadlineTime, finished) → 'live' | 'idle'      │
│    ├─ resumeCohortFetch(env, gw, tier)  ── incremental, alarm-driven  │
│    │     1. read KV "cohort:cursor:{gw}:{tier}" → next page           │
│    │     2. fetch leagues-classic/314/standings?page=N (50 entries)   │
│    │     3. for each entry: fetch /entry/{id}/event/{gw}/picks/       │
│    │        — capped at ~30 fetches per alarm tick (budget)           │
│    │     4. aggregate into KV "cohort:agg:{gw}:{tier}" (jsonb-ish)    │
│    │     5. advance cursor; write back                                │
│    │     6. when all pages done → flush to Supabase + KV snapshot     │
│    └─ flushCohortSnapshot(env, gw, tier)                              │
│          writes cohort_snapshots + upserts cohort_player_stats        │
│                                                                       │
│  fetch handler (existing)                                             │
│    + NEW route GET /cohort/{tier}/{gw}                                │
│         reads "cohort:snapshot:{gw}:{tier}" from KV, fallback to      │
│         Supabase REST (service-role read)                             │
└───────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Supabase REST (anon, RLS read policy)
                              │
┌─────────────────────────────┴─────────────────────────────────────────┐
│ Web client                                                            │
│                                                                       │
│  useCohortBenchmark({ gw, tier, playerId? })                          │
│    → cohort_player_stats query for fast point lookup                  │
│  useCohortSummary({ gw, tier })                                       │
│    → cohort_snapshots latest row (aggregate payload)                  │
└───────────────────────────────────────────────────────────────────────┘
```

Two key properties:

- **The cohort fetch is incremental.** A single 10-minute cron tick cannot fetch Top 10k picks (10,000 fetches at 1 req/sec = 2h 47m). We persist a cursor in KV and progress a small budget per tick. The 1 req/sec FPL ceiling is the hard constraint — everything else flows from it.
- **Storage is Supabase, not just KV.** KV is the serving cache; Supabase is the truth and the historical record. See §6 for the trade-off.

## 4. Cohort tiers + cadence

The tiers we serve at launch:

| Tier slug   | Definition (global classic league 314)        | Entries | Refresh cadence target                                   |
| ----------- | --------------------------------------------- | ------- | -------------------------------------------------------- |
| `top_10k`   | Ranks 1–10,000                                | 10,000  | Once per GW post-deadline, then every ~30 min while live |
| `top_100k`  | Ranks 1–100,000                               | 100,000 | Once per GW post-deadline only (live refresh impossible) |
| `overall`   | Statistically-significant random sample (TBD) | ~5,000  | Once per GW post-deadline                                |
| `legendary` | Ranks 1–1,000                                 | 1,000   | Once per GW post-deadline, then every ~10 min while live |

The `overall` sample is the open question (§10). A random sample of 5k entries from across the global league gives a population-level baseline at fetch cost roughly equal to `legendary`. The naive alternative — fetching everyone — is impossible (~10M managers).

### Why these tiers

- `top_10k` is the LiveFPL benchmark every serious FPL user references.
- `legendary` is cheap (1k entries) and gives us "elite consensus" content for the player cards (it's a differentiator vs LiveFPL, which only shows Top 10k).
- `top_100k` is the "casual elite" tier — slow to refresh but useful for the rank-details "Off 100K" comparator.
- `overall` is a baseline to detect when the elite cohort is diverging from the field (the "differential" signal).

Pro vs Free split (suggested, decide later):

- Free: `top_10k` benchmarks on player cards + rank screen.
- Pro: `legendary`, `top_100k`, `overall` comparisons; historical cohort trends (GW-over-GW).

## 5. FPL rate-limit strategy

This is the hard constraint. LiveFPL appears to run ~1 req/sec sustained against FPL (any higher gets 429s within minutes — community lore, not documented). We assume the same.

### Budget math

| Tier        | Pages of standings (50/pg) | Picks fetches | At 1 req/s | Cron interval | Ticks needed   |
| ----------- | -------------------------- | ------------- | ---------- | ------------- | -------------- |
| `legendary` | 20                         | 1,000         | 17 min     | 10 min        | 2 ticks        |
| `top_10k`   | 200                        | 10,000        | 2h 47m     | 10 min        | 17 ticks       |
| `top_100k`  | 2,000                      | 100,000       | 27h 47m    | 6h            | 5 ticks (~30h) |
| `overall`   | 100 (sample)               | 5,000         | 1h 24m     | 10 min        | 9 ticks        |

So `top_100k` is **a full day behind** — explicitly. We tell the UI this. Stale-while-revalidate semantics: render the last good snapshot with an "as of GW X, captured Y hours ago" badge.

### Worker scheduled() execution limits

Cloudflare cron triggers run on the Workers free + paid plans. Per-invocation CPU is capped (50ms on free, 30s on paid as of last check — verify before enabling). **A single tick must do its budget worth of fetches sequentially with `await new Promise(r => setTimeout(r, 1000))` between them, OR use `Promise.allSettled` on a small parallel batch with a per-batch sleep.** We will start with **30 sequential fetches per tick** (~30 seconds wallclock, ~1 req/sec) and tune.

If we go over CPU time, the alarm dies mid-tick. The cursor in KV protects us — next tick resumes from where we wrote last. But if a tick writes the cursor _after_ the fetch loop (and dies mid-loop), we re-fetch some entries. Acceptable: idempotent aggregation.

### Two cron schedules

```toml
# Live-GW window: 10 min cadence
"*/10 * * * *"

# Idle window: 6h cadence
"0 */6 * * *"
```

The handler reads the live `bootstrap-static` `events[]` to decide which mode applies. If a GW is currently between `deadline_time` and `+48h` (or `finished === false`), use live cadence; else idle. Both crons share the same `scheduled()` entry; the handler is the dispatcher.

### Backoff + rate-limit safety

- Wrap each FPL fetch in a try/catch. On 429 or 5xx, write a "paused until +5min" flag to KV and bail. Next tick checks the flag.
- Re-use the existing worker's user-agent (`SimplyFPL/1.0`).
- Never run two ticks concurrently for the same tier+gw: use a KV lock (`cohort:lock:{gw}:{tier}` with 5-min TTL).

### Why not Cloudflare Queues / Durable Object Alarms?

- **Queues**: paid only (~$5/mo + per-message). Cron alarms are free.
- **DO Alarms**: free, but each DO instance also has CPU limits, and we'd need a DO per tier. Cron is simpler.
- We'll revisit if cron CPU time blocks us. The DO alarm path is a known fallback.

## 6. Storage: Supabase vs R2 vs KV-only

**Recommendation: Supabase Postgres, with KV as the read cache.**

### Trade-off

| Option                | Pros                                                                                                                                                                          | Cons                                                                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KV-only**           | Free with current plan. Worker-local. Sub-ms reads.                                                                                                                           | No SQL. Hard to query (e.g. "give me top-10 captained players for Top10k in GW32"). No relational joins to user data. Per-key 25MB cap. No historical querying. |
| **R2 + worker fetch** | Cheap at scale ($0.015/GB/mo storage, free egress within Cloudflare). Good for JSON blobs.                                                                                    | Still no SQL. Eventual consistency. Writes cost more than KV reads. Same query awkwardness.                                                                     |
| **Supabase Postgres** | SQL queries from web app and worker. RLS for Pro gating. Joins with `profiles` for personalisation. Already paying for it; no new infra. Free tier: 500MB DB + 5GB egress/mo. | Worker → Supabase egress (via Supabase REST) adds 50-100ms latency vs KV. Mitigated by KV cache layer in front.                                                 |

### Why Supabase wins for v1

- The launch features need **aggregate queries** ("most captained player by tier", "top-5 transferred in"). SQL handles this in 10 LoC; a KV+blob solution needs us to maintain per-query precomputed indexes.
- We're already paying for Supabase. Adding 2-3 tables changes nothing on the bill.
- RLS gives us Pro-tier gating for free.
- Web app reads cohort data via `@supabase/supabase-js` (already a dependency in `packages/features`).
- KV in front of Supabase keeps the hot path fast.

### When we'd revisit

- If cohort_snapshots payloads grow huge (>50MB per GW per tier) and bust the 500MB DB tier. Math: 4 tiers × 38 GWs/season × ~1MB/snapshot = ~150MB/season. Comfortably fits.
- If Supabase egress costs become non-trivial. The cohort_player_stats table is the hot read path; one season is ~38 × 4 × 700 rows = ~106k rows. Negligible.

### Open question for Pete

The worker → Supabase write path uses the **service-role key** (RLS bypass). This is required for an unattended cron job to insert rows. The service-role key must be set as a **Worker secret** (`wrangler secret put SUPABASE_SERVICE_ROLE`). Confirmed pattern for this repo? (Stripe webhooks already use it server-side; this is the first worker-side use.) Decision needed Monday before deployment.

## 7. Supabase schema

Migration: `supabase/migrations/0002_cohort_engine.sql` (added in this PR).

### `cohort_snapshots`

The full per-(GW, tier) aggregate as JSONB. One row per (gw, tier, captured_at) — append-only history.

```sql
create table public.cohort_snapshots (
  id bigserial primary key,
  gw smallint not null,
  cohort_tier text not null check (cohort_tier in ('top_10k','top_100k','overall','legendary')),
  captured_at timestamptz not null default now(),
  entries_sampled integer not null,
  is_complete boolean not null default false,
  payload jsonb not null
);
create index on public.cohort_snapshots (gw, cohort_tier, captured_at desc);
```

`payload` shape (JSON Schema, not enforced in DB):

```json
{
  "captains": [{ "player_id": 351, "count": 6234 }, ...],
  "ownership": [{ "player_id": 351, "starting_count": 9012, "bench_count": 234 }, ...],
  "transfers_in":  [{ "player_id": 100, "count": 1822 }, ...],
  "transfers_out": [{ "player_id": 201, "count": 1455 }, ...],
  "chips": { "wildcard": 12, "freehit": 8, "bboost": 19, "tcap": 22 },
  "avg_event_points": 64.3,
  "avg_overall_rank": 5117
}
```

`is_complete = false` means partial — the cursor is still walking. Web app may render but should badge it.

### `cohort_player_stats`

Denormalised per-(GW, tier, player) row for fast point lookup. Rebuilt from `cohort_snapshots.payload` on each flush.

```sql
create table public.cohort_player_stats (
  gw smallint not null,
  cohort_tier text not null,
  player_id integer not null,
  ownership_pct numeric(5,2) not null default 0,
  captain_pct numeric(5,2) not null default 0,
  transfers_in_pct numeric(5,2) not null default 0,
  transfers_out_pct numeric(5,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (gw, cohort_tier, player_id)
);
create index on public.cohort_player_stats (gw, cohort_tier, ownership_pct desc);
create index on public.cohort_player_stats (gw, cohort_tier, captain_pct desc);
```

### RLS

```sql
alter table public.cohort_snapshots enable row level security;
alter table public.cohort_player_stats enable row level security;

-- Anyone authenticated can read latest free-tier cohort
create policy "cohort_snapshots readable by all" on public.cohort_snapshots
  for select using (cohort_tier = 'top_10k' or auth.role() = 'authenticated');

create policy "cohort_player_stats readable by all" on public.cohort_player_stats
  for select using (cohort_tier = 'top_10k' or auth.role() = 'authenticated');
```

**Pro-gating happens in the web layer**, not in RLS. RLS allows authenticated users to read all tiers; the web layer hides Pro tiers from non-Pro accounts. Reason: RLS-based gating would require a joined check against `profiles.is_pro` on every read, which doesn't compose well with the anon read used by the marketing/SEO pages. Revisit if abuse appears.

### Mirror in `packages/types/src/db.ts`

Add `cohort_snapshots` and `cohort_player_stats` to the `Database` interface so the supabase-js client is typed end-to-end. (Out of scope for the foundation PR if time runs short — types can land in a follow-up.)

## 8. Worker module layout

```
apps/worker/src/
├── index.ts              existing — adds /cohort/* fetch route + scheduled() dispatcher
├── live-gw-do.ts         existing (RFC 001)
└── cohort/
    ├── cohort.ts         orchestrator: scheduled() dispatch, mode picker
    ├── fetch-tier.ts     incremental fetch + cursor advance for one (gw, tier)
    ├── aggregate.ts      pure: picks[] → tier aggregate
    └── flush.ts          KV blob → Supabase rows (per tier flush)
```

The orchestrator in `cohort.ts` is the only file `index.ts` imports.

`aggregate.ts` is pure TS — no fetch, no env. Unit-testable in `cohort.spec.ts`. **This is where most of the bugs will live**: averaging across partial samples, handling auto-subs, captaincy multipliers. Test coverage here is non-negotiable.

### Function signatures (informative)

```ts
// cohort.ts
export async function runScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void>;
export function pickCronMode(now: Date, events: FplEvent[]): 'live' | 'idle' | 'off';

// fetch-tier.ts
export interface TierConfig {
  slug: 'top_10k' | 'top_100k' | 'overall' | 'legendary';
  pagesToFetch: number; // 200, 2000, 100, 20
  budgetPerTick: number; // sequential FPL fetches per alarm
}
export async function resumeCohortFetch(
  env: Env,
  gw: number,
  tier: TierConfig
): Promise<{ done: boolean; fetched: number }>;

// aggregate.ts
export interface PartialAggregate {
  captains: Map<number, number>;
  ownership: Map<number, { starting: number; bench: number }>;
  transfersIn: Map<number, number>;
  transfersOut: Map<number, number>;
  chips: Record<string, number>;
  entriesSeen: number;
}
export function emptyAggregate(): PartialAggregate;
export function mergePicks(agg: PartialAggregate, picks: FplEntryGameweekPicks): PartialAggregate;
export function aggregateToPayload(agg: PartialAggregate): CohortSnapshotPayload;

// flush.ts
export async function flushToSupabase(
  env: Env,
  gw: number,
  tier: TierConfig['slug'],
  agg: PartialAggregate
): Promise<void>;
```

## 9. Web-app consumption

`packages/features/src/cohorts/`:

```ts
// use-cohort-benchmark.ts
export interface UseCohortBenchmarkResult {
  data: CohortPlayerStats | undefined;
  isLoading: boolean;
  isError: boolean;
}
export function useCohortBenchmark(args: {
  gw: number | null;
  tier: CohortTier;
  playerId: number;
}): UseCohortBenchmarkResult;

// use-cohort-summary.ts (follow-up)
export function useCohortSummary(args: { gw: number | null; tier: CohortTier }): {
  data: CohortSnapshotPayload | undefined;
  isLoading: boolean;
  isError: boolean;
};
```

Both hooks use react-query against a Supabase REST query. `staleTime` follows the tier cadence (10 min for `top_10k` live, 6h for `top_100k`). UI components live in `packages/ui/src/components/` — to be designed against the existing `stat-card` pattern (out of scope for this PR).

### Cohort-free UI we can ship today

While the engine is being built, two screens can render with data we already have:

1. **Global EO widget** on `/rank/[entryId]`: per-player `selected_by_percent` from `bootstrap-static`. No engine needed.
2. **Partial rank details**: total points + rank movement vs previous GW, from `/entry/{id}/history/`. No cohort needed for the movement number; cohort needed only for "Off Top10k".

These ship as a separate PR (phase 3) so the cohort-engine foundation PR stays focused.

## 10. Failure modes + fallbacks

| Failure                                      | Behaviour                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FPL returns 429 mid-fetch                    | Pause flag in KV; next tick checks flag and skips. Resume after 5 min.                                                                                             |
| Worker CPU timeout mid-tick                  | Cursor advance is the last step; mid-loop death means we re-fetch some entries. Aggregation is idempotent by entry ID (insert-or-overwrite on entry-key seen-set). |
| Supabase down at flush time                  | Keep aggregate in KV. Next tick retries flush. KV expiry is 7 days — plenty of headroom.                                                                           |
| Two ticks fire concurrently                  | KV lock `cohort:lock:{gw}:{tier}` with 5-min TTL. Second tick exits early.                                                                                         |
| Tier never completes (e.g. top_100k partial) | Render the partial with "as of N% complete" badge. Better than nothing.                                                                                            |
| FPL changes pagination format                | Loud — type-checked parsing of `standings` envelope. Throw and alert via Sentry-equivalent (TBD).                                                                  |
| Schema drift between worker and Supabase     | The flush.ts module uses the same `Database` types as the web app. Compile-time check.                                                                             |

## 11. Phased delivery (keyed to GW37/38)

### Phase 0 — Foundation (this PR)

- RFC merged.
- Supabase migration 0002 merged (creates tables, RLS, indexes).
- Worker `cohort/` module skeleton with `aggregate.ts` unit-tested.
- `wrangler.toml` cron entry **commented out** — does not fire until Pete enables it.
- `useCohortBenchmark` hook stub — returns `{ data: undefined, isLoading: false, isError: false }` until tables have data.

### Phase 1 — Enable + dry-run on GW37 (Pete's call, mid-week before deadline)

- Pete uncomments cron triggers in `wrangler.toml` and deploys.
- Set `SUPABASE_SERVICE_ROLE` and `SUPABASE_URL` worker secrets.
- Start with `legendary` tier only (cheapest, fastest to validate).
- Monitor: KV cursor advancement, FPL 429s, Supabase row counts. Expect first full snapshot ~17 minutes after enable.

### Phase 2 — Add tiers, validate against LiveFPL (during GW37)

- Enable `top_10k`. Expect first complete snapshot ~2h 47m after enable.
- Spot-check `cohort_player_stats` against LiveFPL's published numbers for the same GW. Within 1-2pp is a pass.
- Enable `top_100k` (long-running). Watch for memory issues in worker — 100k entries × ~15 picks × 100 bytes each = ~150MB if held in RAM. We hold partial aggregate (counts only), not raw picks; should be ~5MB. Verify.

### Phase 3 — Web UI: cohort-free first, then engine-backed (GW37 → GW38)

- Phase 3a (this weekend, separate PR if time): cohort-free UI — global EO widget + partial rank details.
- Phase 3b (after engine validated): wire `useCohortBenchmark` to live tables.
- Phase 3c (post-launch): `useCohortSummary` for the full stats table.

### Phase 4 — Live cadence tuning (GW38)

- Tune `budgetPerTick` and cron frequency based on observed 429 rate.
- Decide: do we need a manual "kick" endpoint to force a refresh? (e.g. `/cohort/refresh?gw=X&tier=top_10k&token=...`)

### Out of scope for this RFC

- LF-04+ live snapshot loop (RFC 001 territory).
- Helpers/Hurters live widget (depends on LF-04).
- Full stats table comparing across all cohorts (depends on engine tuning).
- Captaincy intel UI beyond "most captained globally" card.
- Mobile.

## 12. Open questions + decisions for Pete

1. **Service-role secret in worker**. Confirm pattern. Likely fine but Pete owns the deployment.
2. **`overall` tier sampling strategy**. Random sample from leagues-classic/314? Or skip the tier entirely at launch? My recommendation: skip at launch, add post-GW38.
3. **Pro gating**. RLS or web-layer? My recommendation: web-layer for v1.
4. **Cost ceiling**. Are we OK with the cron worker invocations? Free plan: 100k requests/day. Live cadence = 144 invocations/day, so trivially under. Confirm.
5. **LiveFPL comparison**. Pete to validate cohort numbers against LiveFPL during GW37. If we're off by >5pp on the top-3 captained players, we have a bug.
6. **Refresh "kick" endpoint**. Should we expose a manual trigger for staff use during a live GW? Lean yes, token-gated.

## 13. Non-goals

- Replacing LiveFPL feature-for-feature on day one. We need parity on `top_10k` ownership/captain stats; everything else is nice-to-have.
- Real-time (sub-minute) cohort updates. The cohort dataset shifts on transfer + captain changes, both of which are locked at deadline. **Mid-GW cohort data is static** — only the live points overlay against it is dynamic. So 10-min cadence post-deadline is overkill except for tracking late chip plays. We can dial back to 1h once we verify.
- A cohort engine that fetches _everything_ (10M managers). Cost-prohibitive and unnecessary; the elite tiers are what users care about.
