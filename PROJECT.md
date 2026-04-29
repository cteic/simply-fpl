# SimplyFPL — Project Context & Implementation Plan

> Last updated: April 2026  
> Status: Scaffold complete, pre-launch development

---

## 1. What We're Building

A Fantasy Premier League companion app that competes directly with [livefpl.net](https://livefpl.net). The site gets millions of hits per week during the season. The opportunity: it has become cluttered and its mobile experience is poor. We build something cleaner, faster, and mobile-native.

**Co-founders**
- Pete — sole technical builder (15+ yrs frontend, React Native, TypeScript)
- Marketing co-founder — 6,000 Twitter FPL followers, community distribution

**Target launch:** Before GW1, August 2026

---

## 2. Monetisation

| Tier | Price | Features |
|------|-------|----------|
| Free | €0 | Live rank, live mini-leagues, price changes, web ads |
| Pro | €4/month or €25/year | Push notifications, transfer planner, EO tracker, ad-free |

**Key decisions:**
- Stripe for web payments only (avoid 30% App Store cut)
- Annual plan at a discount to front-load cash and reduce churn
- No mobile Stripe at launch — direct users to web to subscribe
- Realistic Y1 target: 500–1,000 paying Pro users = €12–25k ARR

---

## 3. Tech Stack

### Apps
| App | Tech | Purpose |
|-----|------|---------|
| `apps/web` | Next.js 15 (App Router) | Main web app |
| `apps/mobile` | Expo 52 + Expo Router | iOS + Android |
| `apps/worker` | Cloudflare Worker | FPL API proxy + KV cache |

### Packages (shared)
| Package | Purpose |
|---------|---------|
| `packages/types` | All FPL domain types — no logic |
| `packages/fpl-client` | API client, live rank calc, price change logic |
| `packages/utils` | Pure helpers (formatRank, formatDeadline, etc.) |
| `packages/ui` | Shared components (cross-platform, future) |
| `packages/tsconfig-config` | Shared TS configs (base, react, react-native) |
| `packages/eslint-config` | Shared ESLint flat config |
| `packages/prettier-config` | Shared Prettier + import ordering |

### Infrastructure
| Service | Use |
|---------|-----|
| Cloudflare Workers + KV | FPL proxy, caching |
| Cloudflare Pages | Web app hosting (auto-deploy from GitHub) |
| Supabase | Auth (email + Google OAuth), Postgres DB |
| Stripe | Payments, subscription management |
| EAS Build | Expo iOS + Android builds |
| GitHub Actions | CI (typecheck, lint, Worker preview deploys) |

### Monorepo tooling
- **pnpm** workspaces (not npm, not yarn)
- **Turborepo** for task orchestration
- **TypeScript** strict mode everywhere
- Conventional commits with scope enforcement

---

## 4. Architecture Decisions

### Why Cloudflare Worker as proxy?
The FPL API (`fantasy.premierleague.com/api`) has no auth, no official docs, and will rate-limit aggressive clients. The Worker sits between all our apps and FPL, adding:
- KV caching per endpoint (bootstrap: 1hr, live GW: 60s, leagues: 90s)
- CORS headers so the web app can call it
- Single point to add auth, rate limiting, or fallback logic later

All FPL API calls go through `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` → Worker → FPL. Never direct from client.

### Why not a shared React Native Web setup?
Push notifications (a key Pro feature) require native APIs. WebView solutions feel like native apps but aren't — the experience gap matters for a live sports tool used during matches.

### Why Supabase over custom auth?
Speed. Supabase gives us email/password, Google OAuth, JWTs, RLS policies, and a typed Postgres client in one. The `profiles` and `subscriptions` tables are all we need to ship.

### Why Stripe web-only at launch?
Apple and Google take 30% of in-app purchases. At €4/month, that's €1.20 gone per subscriber. At launch volumes, direct web subscriptions are fine. Add in-app purchase later only if retention data justifies it.

---

## 5. FPL API Reference

All unofficial. No API key required. Base URL: `https://fantasy.premierleague.com/api`

| Endpoint | TTL | Notes |
|----------|-----|-------|
| `/bootstrap-static/` | 1 hour | All players, teams, events. Heavy response (~500kb). |
| `/event/{gw}/live/` | 60 sec | Live points, BPS for current GW. |
| `/entry/{id}/` | 5 min | Manager overview, overall rank, points. |
| `/entry/{id}/event/{gw}/picks/` | 2 min | Manager's picks for a GW, active chip. |
| `/leagues-classic/{id}/standings/` | 90 sec | League table, paginated. |

**Important nuances:**
- Prices in tenths: `now_cost: 55` = £5.5m. Use `formatPrice()` from `fpl-client`.
- Captain multiplier: 2× normally, 3× with Triple Captain chip.
- Bench Boost activates all 15 picks.
- Bonus points are provisional mid-match. Flag as "provisional" in UI.
- Transfer hit: subtract `event_transfers_cost` from live total.

---

## 6. Database Schema

### `profiles` (extends Supabase `auth.users`)
```sql
id uuid (FK → auth.users)
email text
saved_team_ids integer[]   -- user's saved FPL team IDs
is_pro boolean             -- updated by Stripe webhook
pro_expires_at timestamptz
created_at, updated_at
```

### `subscriptions`
```sql
id uuid
user_id uuid (FK → profiles)
stripe_customer_id text
stripe_subscription_id text
status: active | canceled | past_due | trialing
plan: pro_monthly | pro_yearly
current_period_end timestamptz
```

Migration file: `docs/supabase/001_initial_schema.sql`

---

## 7. MVP Feature Set

### ✅ Free tier (launch)
- **Live Rank** — enter team ID → see live GW points + overall rank, auto-refreshing
- **Live Mini-Leagues** — enter league ID → live table with rank movement
- **Price Change Predictor** — risers/fallers based on net transfer activity
- **Saved team ID** — persisted per user account (requires signup)

### 🔒 Pro tier (launch or shortly after)
- Push notifications (price changes, autosubs, bonus swings)
- Transfer planner
- Effective Ownership (EO) tracker
- Ad-free

### ❌ Explicitly deferred
- Live bonus/BPS tracker (v2)
- What If? rank scenarios (v2)
- Captain comparison tools (v2)
- In-app purchases / mobile Stripe (v2)

---

## 8. GitHub Issues — Implementation Milestones

Use these as your issue list. Suggested labels: `infra`, `backend`, `web`, `mobile`, `auth`, `payments`.

### Phase 1 — Infrastructure (Day 1–2)

- [ ] **#1** `[infra]` Create private GitHub repo, push scaffold, protect `main` branch
- [ ] **#2** `[infra]` Create Cloudflare account, KV namespace (`wrangler kv:namespace create FPL_CACHE`), deploy Worker to preview
- [ ] **#3** `[infra]` Create Supabase project, run `001_initial_schema.sql`, confirm RLS policies
- [ ] **#4** `[infra]` Create Stripe account, add Pro Monthly + Pro Yearly products, note price IDs
- [ ] **#5** `[infra]` Set up Cloudflare Pages connected to GitHub repo (auto-deploy `apps/web` on push to `main`)
- [ ] **#6** `[infra]` Add GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- [ ] **#7** `[infra]` Add all `.env.local` values for web; `.env` for mobile and worker

### Phase 2 — Web: Core Features (Day 2–5)

- [ ] **#8** `[web]` `globals.css` — design system tokens, dark theme, typography (DM Sans / DM Mono)
- [ ] **#9** `[web]` Nav component — links to Rank, Prices, Leagues; auth state (sign in/out)
- [ ] **#10** `[web]` Home page — hero with team ID input, feature cards
- [ ] **#11** `[web]` Live Rank page — `/rank/[entryId]` fully styled with picks grid
- [ ] **#12** `[web]` Price Changes page — `/prices` with riser/faller table, sortable
- [ ] **#13** `[web]` Mini-Leagues page — `/leagues/[leagueId]` with live table
- [ ] **#14** `[web]` Auth pages — `/auth/login`, `/auth/signup` using Supabase
- [ ] **#15** `[web]` Settings page — saved team IDs, subscription status, upgrade CTA
- [ ] **#16** `[web]` Upgrade page — Pro feature list + Stripe checkout button
- [ ] **#17** `[web]` Deploy to production on Cloudflare Pages, verify Worker CORS

### Phase 3 — Payments (Day 5–7)

- [ ] **#18** `[payments]` Stripe Checkout flow — POST `/api/stripe/checkout` → redirect → return to `/settings?upgrade=success`
- [ ] **#19** `[payments]` Stripe webhook — verify signature, update `is_pro` in Supabase on subscription events
- [ ] **#20** `[payments]` Pro feature gates — check `isPro` from auth context before rendering gated components
- [ ] **#21** `[payments]` Subscription management — link to Stripe customer portal from Settings

### Phase 4 — Mobile (Day 6–10)

- [ ] **#22** `[mobile]` Configure EAS Build (`eas.json`), add bundle IDs for iOS + Android
- [ ] **#23** `[mobile]` Live Rank screen — fully styled, team ID input, picks list
- [ ] **#24** `[mobile]` Prices screen — riser/faller filter tabs
- [ ] **#25** `[mobile]` Leagues screen — league ID input, live table
- [ ] **#26** `[mobile]` Profile screen — auth sign in/up, saved team IDs via Supabase
- [ ] **#27** `[mobile]` Internal TestFlight build (iOS) + APK (Android) for testing
- [ ] **#28** `[mobile]` App Store + Play Store submissions

### Phase 5 — Polish & Launch (Day 10–14)

- [ ] **#29** `[web]` SEO — meta tags, OG images, sitemap, robots.txt
- [ ] **#30** `[web]` Error boundaries + empty states on all pages
- [ ] **#31** `[web]` Google Analytics or Plausible analytics
- [ ] **#32** `[infra]` Custom domain (`simplyfpl.com`) on Cloudflare Pages + Worker
- [ ] **#33** `[infra]` Uptime monitoring (Better Uptime or Cloudflare Alerts)
- [ ] **#34** `[web]` Ad placement on free tier (Carbon Ads or direct FPL tool sponsors)
- [ ] **#35** `[mobile]` Push notification infrastructure (Expo Push API + Supabase Edge Function trigger)
- [ ] **#36** `[web]` Launch — co-founder posts to Twitter, Reddit r/FantasyPL, FPL community

---

## 9. Project Structure

```
simplyfpl-mono/
├── apps/
│   ├── web/                        # Next.js 15
│   │   └── src/
│   │       ├── app/                # App Router pages
│   │       │   ├── rank/[entryId]/ # Live rank
│   │       │   ├── prices/         # Price changes
│   │       │   ├── leagues/        # Mini-leagues (TODO)
│   │       │   ├── auth/           # Login/signup (TODO)
│   │       │   ├── settings/       # User settings (TODO)
│   │       │   └── api/stripe/     # Checkout + webhook
│   │       ├── components/         # Page components
│   │       ├── hooks/              # use-auth, etc.
│   │       ├── lib/                # supabase, supabase-server
│   │       └── queries/            # React Query hooks
│   ├── mobile/                     # Expo + Expo Router
│   │   └── src/app/
│   │       ├── index.tsx           # Live rank tab
│   │       ├── prices.tsx          # Prices tab
│   │       ├── leagues.tsx         # Leagues tab
│   │       └── profile.tsx         # Profile tab
│   └── worker/                     # Cloudflare Worker
│       ├── src/index.ts            # Proxy + KV cache
│       └── wrangler.toml
├── packages/
│   ├── types/src/index.ts          # All FPL domain types
│   ├── fpl-client/src/
│   │   ├── client.ts               # API client
│   │   ├── live-rank.ts            # calculateLivePoints()
│   │   ├── price-changes.ts        # predictPriceChanges()
│   │   └── index.ts
│   ├── utils/src/index.ts          # formatRank, formatDeadline, etc.
│   ├── ui/src/index.ts             # Shared components (stub, to build)
│   ├── tsconfig-config/            # base, react, react-native tsconfigs
│   ├── eslint-config/              # Flat config ESLint
│   └── prettier-config/            # Prettier + import ordering
├── docs/
│   └── supabase/
│       └── 001_initial_schema.sql
├── .github/workflows/
│   └── code-checks.yml             # CI: typecheck + lint
├── CLAUDE.md                       # AI coding instructions
├── README.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 10. Getting Started (Fresh Install)

```bash
# 1. Unzip scaffold
tar -xzf simplyfpl-mono.tar.gz
cd simplyfpl-mono

# 2. Copy env files
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# 3. Install — must fully complete before anything else
pnpm install

# 4. Build shared packages first (required before apps can resolve imports)
pnpm build:packages

# 5. Start development servers (separate terminals)
pnpm dev:worker   # Cloudflare Worker on :8787
pnpm dev:web      # Next.js on :3000
pnpm dev:mobile   # Expo dev server
```

**Required external accounts before dev:web works:**
- Supabase project → fill `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Run `docs/supabase/001_initial_schema.sql` in Supabase SQL editor

**Required for payments to work:**
- Stripe account → test mode keys → fill `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Create two Stripe products (Pro Monthly €4, Pro Yearly €25) → fill `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`
- `stripe listen --forward-to localhost:3000/api/stripe/webhook` for local webhook testing

**Required for Worker KV:**
```bash
cd apps/worker
npx wrangler kv:namespace create FPL_CACHE
# Copy the ID into wrangler.toml
npx wrangler kv:namespace create FPL_CACHE --preview
# Copy preview ID into wrangler.toml
```

---

## 11. Coding Conventions

Mirrors `leather-io/mono`. See `CLAUDE.md` for full detail. Key rules:

- No `enum` — use `const` objects or union types
- `interface` for object shapes
- `function` declarations for components and top-level functions; arrow functions for callbacks
- No `as` casts, `!` non-null assertions, or `any`
- Kebab-case filenames: `live-rank-view.tsx`
- No `index.ts` except package barrel exports
- Tests co-located as `*.spec.ts`
- Commits: `feat(web): add live rank page`, `fix(worker): handle FPL 429 response`
- PRs target `dev`, not `main`

---

## 12. Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| FPL API rate limiting | Cloudflare Worker KV cache; never call FPL directly from client |
| FPL API changes (unofficial) | Monitor livefpl.net; it breaks at the same time, giving early warning |
| Bonus points accuracy | Mark provisional clearly; "Live (provisional bonus)" label |
| App Store review delays | Submit early, use TestFlight for beta; web is the primary launch |
| Low conversion to Pro | Free tier must be genuinely useful; Pro features must be visible but gated |
| Seasonal traffic spikes (GW1, DGWs) | Cloudflare handles edge traffic; Worker KV absorbs FPL API load |

---

## 13. Revenue Projections

| Scenario | Pro Users | MRR | ARR |
|----------|-----------|-----|-----|
| Conservative | 200 | €640 | €7,680 |
| Realistic | 750 | €2,400 | €28,800 |
| Optimistic | 2,000 | €6,400 | €76,800 |

Assumptions: 70% monthly / 30% annual mix. Annual at €25 = €2.08/month equivalent.

---

## 14. Post-Launch Roadmap

**v1.1 (September 2026)**
- Live BPS / bonus tracker
- Autosub projections
- Push notification delivery (Expo Push + Supabase Edge Function)

**v1.2 (October 2026)**
- Transfer planner (Pro)
- EO tracker (Pro)
- Differential finder

**v2.0 (January 2027)**
- What If? rank scenarios
- Captain comparison
- Historical rank tracking
- Team value tracker
