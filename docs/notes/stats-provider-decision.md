# Stats Provider Decision — Paid-Tier Player Stats Feature

**Date**: 2026-07-03  
**Issue**: #389  
**Status**: Recommendation made; no external contract signed yet

---

## What the FPL API already exposes (free)

Before evaluating paid providers it is worth mapping what the official FPL API already gives us at no cost.

**`/api/bootstrap-static/` — season-aggregate stats per player:**

| Field                               | Description                                 |
| ----------------------------------- | ------------------------------------------- |
| `expected_goals`                    | Season xG (cumulative)                      |
| `expected_assists`                  | Season xA (cumulative)                      |
| `expected_goal_involvements`        | xG + xA (FPL's xGI metric)                  |
| `expected_goals_conceded`           | xGC (season, defenders/GKs)                 |
| `expected_goals_per_90`             | xG per 90 min                               |
| `expected_assists_per_90`           | xA per 90 min                               |
| `expected_goal_involvements_per_90` | xGI per 90 min                              |
| `expected_goals_conceded_per_90`    | xGC per 90 min                              |
| `ict_index`                         | FPL's Influence-Creativity-Threat composite |
| `influence`                         | Influence sub-score                         |
| `creativity`                        | Creativity sub-score                        |
| `threat`                            | Threat sub-score                            |

**`/api/element-summary/{id}/` — per-gameweek history:**  
Returns a `history` array with per-GW stats for each player, including the expected goals fields above broken down by fixture. This means we can display GW-by-GW xG trends at zero marginal cost.

**What the FPL API does not provide:**

- Individual shot locations / shot maps
- Post-shot xG (PSxG)
- Per-fixture xG at match level until element-summary is polled
- Defensive event data (blocks, pressures, off-ball runs)

The FPL expected goals data has been available since 2022-23 and is confirmed present in the 2025-26 season. It is Opta-sourced underneath — FPL has an Opta data partnership — so the quality is legitimate.

**Legal note on FPL API use:** The FPL API is undocumented and has no published developer ToS. Premier League data rights are controlled by Football DataCo, which has an exclusive official data partnership with Genius Sports through 2029. In practice, hundreds of FPL companion apps use the API without enforcement action; the risk for a paid SaaS is non-zero but widely accepted in the community. Obtain legal opinion before scaling aggressively.

**Important:** The `/api/event/{gw}/live/` endpoint does **not** include in-play xG values — those are cumulative season totals in bootstrap-static only. Per-GW xG breakdowns come from `element-summary/{id}/history[]`, which is polled rather than live.

---

## Provider comparison

| Provider                            | Monthly cost                                                                                                                                                                                                                                                                                                                                                | Commercial display licence                                                                                                                                                                                                                                                                                                   | Data freshness                                                                                                                                         | PL xG/xA                                                           | Shot-level data                                      | Notes                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **FPL Official API**                | Free                                                                                                                                                                                                                                                                                                                                                        | Implicit (public API, no ToS restriction on FPL companion apps)                                                                                                                                                                                                                                                              | Live GW refresh (60s)                                                                                                                                  | ✅ Full xGI/xGC + per-90 + per-GW via element-summary              | ❌                                                   | Already integrated                                                                                                            |
| **Stats Perform / Opta**            | Sales-led. No published price. Startup range: est. $500–$2,000+/mo for a single-competition limited feed; full Opta F24 event data for PL: est. $10k–$30k+/yr. Pay-per-season models reportedly available.                                                                                                                                                  | Negotiated per contract; full commercial rights-holder licence — the only provider that definitively solves Football DataCo / Genius Sports licencing.                                                                                                                                                                       | Real-time push (Opta F24, seconds-level)                                                                                                               | ✅ Full event data (source behind FPL's own expected_goals fields) | ✅ Full shot maps                                    | Viable only post meaningful revenue. Requires account manager.                                                                |
| **API-Football** (api-sports.io)    | $19/mo (7,500 req/day), $29/mo (75k/day), $39/mo (150k/day)                                                                                                                                                                                                                                                                                                 | ⚠️ **Legally risky.** ToS (May 2025) states: "API-Football does not grant any commercial rights on sports competitions" and "the use of their data for… fantasy sports platforms… may require additional licenses from the relevant rights holders." User is responsible for obtaining rights-holder licences independently. | Live + ~30min lag on some fields                                                                                                                       | Inconsistent — xG not guaranteed for PL on all fixtures            | ❌                                                   | Cheap but the ToS is incompatible with a commercial fantasy app without additional PL/Premier League rights. Not recommended. |
| **SportMonks**                      | €29/mo Starter (5 leagues), **€99/mo Growth (30 leagues, includes PL)**, €249/mo Pro (120 leagues). xG is a separate **Expected Metrics Add-on** with three tiers: Basic (~€19–€99/mo, 12hr post-match delay), Standard (end-of-match), Advanced (~€199–€399/mo, real-time live xG). For PL + end-of-match xG on Growth: indicative **€120–€160/mo** total. | ✅ Paid plans explicitly include fantasy sports and commercial display. No separate rights-holder licence required.                                                                                                                                                                                                          | xG Basic: 12hr post-match. xG Standard: minutes after full-time. xG Advanced: live in-match.                                                           | ✅ xG, xA, PSxG (from 2024/25 PL season onwards)                   | ✅ Shot locations via xG endpoints                   | Self-serve sign-up. EU-based pricing. Best-fit if shot maps are needed. 14-day free trial.                                    |
| **football-data.org**               | Free tier (basic, 10 req/min), €99/mo Advanced, €199/mo Pro                                                                                                                                                                                                                                                                                                 | Terms ambiguous for commercial fantasy display; not marketed at fantasy apps                                                                                                                                                                                                                                                 | End of match; no live                                                                                                                                  | ❌ xG "coming soon" as of Jan 2026 (not live as of Jul 2026)       | ❌                                                   | No xG yet. Not suitable.                                                                                                      |
| **StatsBomb Open Data**             | Free                                                                                                                                                                                                                                                                                                                                                        | ❌ Non-commercial only (research/education). ToS prohibits commercial use.                                                                                                                                                                                                                                                   | Historical only — PL coverage limited to **2003/04** (Arsenal Invincibles, 38 matches) and **2015/16** (380 matches). No current or recent PL seasons. | ✅ (those two seasons only)                                        | ✅ (StatsBomb 360 positional data for those seasons) | Research reference only. Cannot be used in SimplyFPL.                                                                         |
| **StatsBomb Commercial** (via Hudl) | Sales-led. No published pricing. Estimated five figures/yr for live PL. Post-match StatsBomb 360 data generated hours after full-time; live API available at higher cost.                                                                                                                                                                                   | Negotiated per contract                                                                                                                                                                                                                                                                                                      | Post-match (hours); live API available                                                                                                                 | ✅ Best-in-class shot-level xG model                               | ✅ Full StatsBomb 360                                | Same category as Opta — overkill for FPL use case, not viable pre-revenue.                                                    |

---

## Recommendation

### Phase 1 (launch / pre-revenue): FPL API only — no external cost

The FPL API's `expected_goals*` and `ict_index` fields are sufficient for a compelling paid-tier stats panel:

- Season xG, xA, xGI, xGC and per-90 variants already in `bootstrap-static` (cached 1h)
- GW-by-GW xG breakdown via `element-summary/{id}/` (cache 5min, proxied through worker)
- ICT index sub-scores (influence, creativity, threat)

This data is Opta-sourced, live-season, and free. The gap versus direct Opta access at launch is shot-level granularity only. Displaying per-GW xGI trend charts, over/under-performance vs xG, and ICT breakdowns in player cards is a real paid USP that livefpl.net doesn't surface cleanly today.

**Monthly cost: €0**

### Phase 2 (post-revenue, ~100+ Pro subscribers): SportMonks Growth + xG add-on

If shot maps or fixture-level xG breakdowns (e.g. individual chance quality) are wanted post-launch:

- SportMonks Growth (€99/mo) covers PL plus 29 other leagues
- Add the Expected Metrics Standard add-on (end-of-match xG, no live delay tolerated for a GW-wrap product): indicative **€24–€60/mo** for PL scope (exact price shown in MySportMonks dashboard at checkout)
- **Working budget: ~€123–€160/mo**

SportMonks is the only self-serve provider with explicit fantasy sports commercial licensing and current-season PL xG (available from 2024/25 onwards). No sales process — sign up with a card, add-ons managed in their dashboard. 14-day free trial available.

**Actions Pete must take manually for Phase 2:**

1. Sign up at sportmonks.com/football-api/plans-pricing — choose Growth plan
2. Add the Expected Metrics / xG add-on at checkout (exact price shown in their dashboard)
3. Generate an API token, add as `SPORTMONKS_API_KEY` in Cloudflare Worker secrets (`wrangler secret put SPORTMONKS_API_KEY`)

---

## Integration sketch — Phase 1 (FPL API fields, zero cost)

This fits directly into the existing worker + KV + entitlement pattern.

### 1. Feature flag

```
# .env.local / Cloudflare Pages env
NEXT_PUBLIC_FEATURE_STATS=true
```

In `apps/web/src/lib/feature-flags.ts` (following existing pattern):

```ts
export const FEATURE_STATS = process.env['NEXT_PUBLIC_FEATURE_STATS'] === 'true';
```

### 2. Worker route — element-summary proxy

New route in `apps/worker/src/index.ts` (before the generic `/fpl/*` catch-all):

```
GET /fpl/element-summary/:id/
```

This route already exists as a passthrough in `passthrough.ts` (`/element-summary/{N}/`), so no new worker code is needed for Phase 1. Cache TTL follows the existing default (120s), which is adequate — element-summary doesn't change mid-match.

Optionally add a dedicated slim handler mirroring `bootstrap-static-slim` to strip the `fixtures` array from the response (saves ~60% payload):

```
GET /fpl/element-summary-slim/:id/
→ returns { history: [...], history_past: [...] }  (drops fixtures blob)
```

KV key: `fpl:/element-summary-slim/{id}/` · TTL: 300s

### 3. Types

Extend `packages/types/src/index.ts` with the per-GW stats entry:

```ts
interface FplElementHistoryEntry {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  expected_goals: string; // decimal string e.g. "0.43"
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
}

interface FplElementSummary {
  history: FplElementHistoryEntry[];
  history_past: FplElementHistoryPast[];
}
```

### 4. Feature hook — `packages/features`

```ts
// packages/features/src/stats/use-player-stats.ts
export function usePlayerStats(playerId: number, workerUrl: string) {
  return useQuery({
    queryKey: ['player-stats', playerId],
    queryFn: () => fetchPlayerStats(playerId, workerUrl),
    staleTime: 5 * 60 * 1000,
    enabled: playerId > 0,
  });
}
```

### 5. Server-side entitlement gate

In any server component or route handler that returns stats data:

```ts
const tier = resolveTier({ tier: profile?.tier ?? null })
if (tier === 'free') {
  return NextResponse.json({ error: 'Pro tier required' }, { status: 402 })
}
```

For client-side UI gating (non-sensitive — already gated server-side):

```tsx
import { FEATURE_STATS } from '@/lib/feature-flags'
import { useTier } from '@simplyfpl/features'

if (!FEATURE_STATS) return null
const { tier } = useTier()
if (tier === 'free') return <ProUpsellBanner />
```

### 6. Phase 2 additions (SportMonks)

If SportMonks is adopted, add one new worker route:

```
GET /stats/player/:id/shots?fixture=N
→ proxies SportMonks /fixtures/{N}/statistics with API key injected server-side
KV key: stats:shots:{fixtureId} · TTL: 1800s (30min, post-match)
```

API key stays in Worker secrets — never exposed to the client. The entitlement check happens in the same server-side gate above; the worker itself is an internal proxy that trusts the caller (or adds its own `x-internal-key` check matching the existing `notify/dispatch` pattern).

---

## Decision log

- **Understat / FBref scraping**: Rejected. ToS violation, brittle, builds business dependency on scraping. Issue #389 noted this explicitly.
- **API-Football**: Rejected. ToS explicitly states fantasy sports use requires additional rights-holder licences that API-Football itself does not provide. Cheap but not legal for this use case without a PL data licence we cannot obtain cheaply.
- **football-data.org**: Rejected for now. No xG data available as of July 2026.
- **StatsBomb Open**: Rejected. Non-commercial licence, no current PL data.
- **Opta/Stats Perform direct**: Deferred. No self-serve; startup range est. $500–$2k/mo for a limited feed. Full F24 event data is $10k–$30k+/yr. Pay-per-season models reportedly exist — worth a call when revenue allows. Only provider that cleanly solves Football DataCo rights (Genius Sports exclusive partnership runs through 2029).
- **SportMonks**: Green-lit as the Phase 2 path if shot maps are wanted post-revenue. Self-serve, explicit fantasy sports commercial licensing.
- **FPL API own fields**: Chosen for Phase 1. No cost, live, Opta-sourced, already partially typed in the codebase.
