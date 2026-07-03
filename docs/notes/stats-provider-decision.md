# Stats Provider Decision — Paid-Tier Player Stats Feature

**Date**: 2026-07-03  
**Issue**: #389  
**Status**: Recommendation made; no external contract signed yet

---

## What the FPL API already exposes (free)

Before evaluating paid providers it is worth mapping what the official FPL API already gives us at no cost.

**`/api/bootstrap-static/` — season-aggregate stats per player:**

| Field | Description |
|---|---|
| `expected_goals` | Season xG (cumulative) |
| `expected_assists` | Season xA (cumulative) |
| `expected_goal_involvements` | xG + xA (FPL's xGI metric) |
| `expected_goals_conceded` | xGC (season, defenders/GKs) |
| `expected_goals_per_90` | xG per 90 min |
| `expected_assists_per_90` | xA per 90 min |
| `expected_goal_involvements_per_90` | xGI per 90 min |
| `expected_goals_conceded_per_90` | xGC per 90 min |
| `ict_index` | FPL's Influence-Creativity-Threat composite |
| `influence` | Influence sub-score |
| `creativity` | Creativity sub-score |
| `threat` | Threat sub-score |

**`/api/element-summary/{id}/` — per-gameweek history:**  
Returns a `history` array with per-GW stats for each player, including the expected goals fields above broken down by fixture. This means we can display GW-by-GW xG trends at zero marginal cost.

**What the FPL API does not provide:**
- Individual shot locations / shot maps
- Post-shot xG (PSxG)
- Per-fixture xG at match level until element-summary is polled
- Defensive event data (blocks, pressures, off-ball runs)

The FPL expected goals data has been available since 2022-23 and is confirmed present in the 2025-26 season. It is Opta-sourced underneath — FPL has an Opta data partnership — so the quality is legitimate.

---

## Provider comparison

| Provider | Monthly cost | Commercial display licence | Data freshness | PL xG/xA | Shot-level data | Notes |
|---|---|---|---|---|---|---|
| **FPL Official API** | Free | Implicit (public API, no ToS restriction on FPL companion apps) | Live GW refresh (60s) | ✅ Full xGI/xGC + per-90 + per-GW via element-summary | ❌ | Already integrated |
| **Stats Perform / Opta** | Sales-led. Estimated £20k–£100k+/yr for direct contract (community reports, no published price). No self-serve tier. | Negotiated per contract; requires formal media/tech rights agreement | Real-time push (Opta Live) | ✅ Full event data | ✅ Full shot maps | Viable only post Series A. Requires account manager. |
| **API-Football** (api-sports.io) | $19/mo (7,500 req/day), $29/mo (75k/day), $39/mo (150k/day) | ⚠️ **Legally risky.** ToS (May 2025) states: "API-Football does not grant any commercial rights on sports competitions" and "the use of their data for… fantasy sports platforms… may require additional licenses from the relevant rights holders." User is responsible for obtaining rights-holder licences independently. | Live + ~30min lag on some fields | Inconsistent — xG not guaranteed for PL on all fixtures | ❌ | Cheap but the ToS is incompatible with a commercial fantasy app without additional PL/Premier League rights. Not recommended. |
| **SportMonks** | €29/mo Starter (5 leagues), **€99/mo Growth (30 leagues, includes PL)**, €249/mo Pro (120 leagues). xG is an **Expected Metrics Add-on** starting at ~€24/mo for limited coverage; full PL xG realistically €50–€150/mo on top of base. Indicative total for PL + xG: **€123–€249/mo**. | ✅ Paid plans explicitly include fantasy sports and commercial display. No separate rights-holder licence required. | Live (push webhooks or polling); match-level stats typically available within minutes of full-time | ✅ xG, xA, xGA, PSxG | ✅ Shot locations available as part of xG add-on | Self-serve sign-up. EU-based pricing. Best-fit if shot maps are needed. |
| **football-data.org** | Free tier (basic, 10 req/min), €99/mo Advanced, €199/mo Pro | Terms ambiguous for commercial fantasy display; not marketed at fantasy apps | End of match; no live | ❌ xG "coming soon" as of Jan 2026 (not live as of Jul 2026) | ❌ | No xG yet. Not suitable. |
| **StatsBomb Open Data** | Free | ❌ Non-commercial only (research/education). ToS prohibits use in commercial products. | Historical (past seasons only; no current 2025-26 PL) | ✅ (historical) | ✅ (historical) | Research reference only. Cannot be used in SimplyFPL. |
| **StatsBomb Commercial** (via Hudl) | Sales-led. Enterprise contracts; no published pricing. Estimated comparable to Opta for live PL. | Negotiated per contract | Real-time | ✅ Full event data | ✅ Full shot maps | Same category as Opta — not viable pre-revenue. |

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
- Add the Expected Metrics add-on for PL xG/PSxG/shot locations: budget **€50/mo** as a working estimate (exact pricing self-serve at sign-up; varies by league count)
- **Working budget: ~€149/mo**

SportMonks is the only self-serve provider with explicit fantasy sports commercial licensing and live PL xG. It requires no sales process — sign up with a card.

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
export const FEATURE_STATS = process.env['NEXT_PUBLIC_FEATURE_STATS'] === 'true'
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
  element: number
  fixture: number
  opponent_team: number
  total_points: number
  round: number
  minutes: number
  goals_scored: number
  assists: number
  expected_goals: string   // decimal string e.g. "0.43"
  expected_assists: string
  expected_goal_involvements: string
  expected_goals_conceded: string
}

interface FplElementSummary {
  history: FplElementHistoryEntry[]
  history_past: FplElementHistoryPast[]
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
  })
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
- **Opta/Stats Perform direct**: Deferred indefinitely. Enterprise-only, multi-year contract, five-figure annual cost. Revisit at Series A or significant revenue.
- **SportMonks**: Green-lit as the Phase 2 path if shot maps are wanted post-revenue. Self-serve, explicit fantasy sports commercial licensing.
- **FPL API own fields**: Chosen for Phase 1. No cost, live, Opta-sourced, already partially typed in the codebase.
