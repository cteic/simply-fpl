# Frank pipeline — status map (2026-07-03)

## Overview

Frank is SimplyFPL's AI team coach, built on Claude. It has two modes:

- **Weekly cache** (all tiers) — Tuesday cron generates gameweek advice via Claude and stores it in KV; all users read the same cached payload.
- **On-demand** (Ultimate tier only) — user submits a question; the web API builds a personalised prompt and calls Claude in real time.

---

## Data flow

### 1. Worker cron — weekly cache

**Schedule:** `0 6 * * 2` (Tuesday 06:00 UTC, after Monday GW deadline)

**File:** `apps/worker/src/frank/weekly-cache.ts`

```
FPL_CACHE.get('fpl:/bootstrap-static/')      ← KV (or live fallback)
  → buildContextBlock(bootstrap)              ← top-60 available players
  → buildPrompt(gwId)
  → Anthropic claude-haiku-4-5-20251001 (system: context+cache_control, user: prompt)
  → FrankWeeklyPayload { gameweek, generatedAt, captainCandidates[], transferTargets[], chipNote }
  → FRANK_WEEKLY_CACHE.put('frank:weekly:gw{N}', payload, TTL=10d)
  → FRANK_WEEKLY_CACHE.put('frank:weekly',         payload, TTL=10d)
```

**Context sent to Anthropic (pre-upgrade):** Top-60 players sorted by total points — name, team, position, cost, points, ownership %, GW transfers, injury news. No fixture difficulty ratings. No price-change predictions.

### 2. Worker GET /frank/weekly

**File:** `apps/worker/src/frank/weekly-cache.ts` → `handleFrankWeekly`

Reads `frank:weekly` from `FRANK_WEEKLY_CACHE`. Returns 200 + JSON + `X-Cache: HIT`, or 404 + `X-Cache: MISS`.

### 3. Web query — `useFrankWeekly`

**File:** `apps/web/src/queries/frank.ts`

React Query hook. Hits `NEXT_PUBLIC_API_URL/frank/weekly` directly from the browser. `staleTime: 1h`. Used by all tiers.

### 4. Access gating

**File:** `packages/features/src/frank/access.ts`

`resolveFrankAccess(tier: Tier) → FrankAccess { source, canAskOnDemand, upgradeTo }`

| Tier     | source       | canAskOnDemand |
| -------- | ------------ | -------------- |
| free     | weekly-cache | false          |
| pro      | weekly-cache | false          |
| ultimate | live         | true           |

### 5. Web API route — POST /api/frank/ask

**File:** `apps/web/src/app/api/frank/ask/route.ts` (Next.js Edge)

**Flow:**

1. Feature flag guard (`FEATURE_FRANK_ONDEMAND`)
2. Supabase auth → get `user.id`
3. Profile fetch → `tier`, `fpl_entry_id`
4. `resolveTier` → `resolveFrankAccess` → 402 if not Ultimate
5. Monthly quota check against `frank_queries` (soft=50, hard=80)
6. Parse request body (`question` max 500 chars)
7. Parallel fetch: `GET /frank/weekly` + `GET /snapshot/entry/{id}`
8. Build system prompt: instruction block + context (weekly + squad snapshot with `cache_control: ephemeral`)
9. Optimistic quota reservation: INSERT `frank_queries` row
10. Concurrent re-count guard (rolls back reservation if over hard cap)
11. Anthropic call (`claude-haiku-4-5-20251001`, max_tokens=512)
12. UPDATE reservation row with response + token counts
13. Return `{ advice, follow_up_question, used, softCap, hardCap }`

**Context sent to Anthropic (pre-upgrade):**

- Weekly advice payload (captain picks, transfer targets, chip note)
- Squad snapshot via `projectSnapshot`: chip, GW history, picks (player IDs only — no names), entry overall rank/points. Truncated to 4000 chars.
- **Missing:** player names for picks, fixture difficulty ratings, price-change predictions for squad players.

### 6. Frank view

**File:** `apps/web/src/components/views/frank-view.tsx`

- Weekly advice section (all tiers): captain picks + transfer targets + chip note.
- Ask Frank form (Ultimate, `FEATURE_FRANK_ONDEMAND=true`): textarea → POST to API route → renders `advice` + `follow_up_question` + quota progress bar + history.
- Upgrade CTA for non-Ultimate tiers.

### 7. Admin panel

**File:** `apps/web/src/app/admin/frank/page.tsx`

Server-rendered edge page gated by `FRANK_ADMIN_EMAILS`. Shows monthly aggregate per user: query count, tokens_in, tokens_out.

---

## KV namespaces

| Namespace            | Binding | Usage                                                     |
| -------------------- | ------- | --------------------------------------------------------- |
| `FRANK_WEEKLY_CACHE` | KV      | Weekly payload + (after upgrade) on-demand question cache |
| `FPL_CACHE`          | KV      | Bootstrap, fixtures, prices (read by Frank cron)          |

---

## Database

**Table:** `frank_queries`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        | PK                               |
| user_id    | uuid        | FK auth.users CASCADE            |
| question   | text        |                                  |
| response   | jsonb       | Nullable until AI call completes |
| model      | text        |                                  |
| tokens_in  | integer     |                                  |
| tokens_out | integer     |                                  |
| created_at | timestamptz | Indexed with user_id             |

RLS: owner SELECT; no public INSERT (service-role only from API route).

---

## Environment variables

| Variable                 | Where        | Purpose                          |
| ------------------------ | ------------ | -------------------------------- |
| `ANTHROPIC_API_KEY`      | Worker + Web | API key (secret)                 |
| `FEATURE_FRANK_ONDEMAND` | Web (client) | `NEXT_PUBLIC_` flag for UI       |
| `FEATURE_FRANK_ONDEMAND` | Web (server) | Server flag for route guard      |
| `FRANK_ADMIN_EMAILS`     | Web          | Comma-separated admin email list |
| `API_URL`                | Web          | Worker base URL                  |

---

## Gaps identified (issue #388)

**Context depth:** Prompt contains player IDs without names, no fixture difficulty ratings (FDR), no price-change predictions. Squad picks lack enrichment for the AI to reason about alternatives.

**Cost control:** Every unique question calls Anthropic. No deduplication. No per-day spend cap.

**Prompt quality:** No eval harness. Regressions in advice quality are invisible.

**Follow-ups:** Streaming responses, proactive pre-deadline brief, share-card for socials. These are out of scope for stage 1.
