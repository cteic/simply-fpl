DO NOT ADD, REMOVE, OR MODIFY COMMENTS IN CODE — including punctuation and formatting in existing comments. Only touch comments if explicitly asked.

After ANY code changes, you MUST run verification (see Verification section). Do not report a task as complete until all checks pass.

## Personal preferences

- **PRs**: title + summary bullets only. No "Generated with Claude Code" footer, no Test Plan section.
- **Commits**: no `Co-Authored-By: Claude` trailer.
- **Branches**: short kebab-case, scoped prefix when useful (`fix/...`, `ci/...`, `feat/...`).
- **Tone**: terse. Skip trailing "summary of what I just did" — the diff speaks for itself.

# SimplyFPL — Claude Instructions

SimplyFPL is a freemium FPL (Fantasy Premier League) companion app — a faster, cleaner alternative to livefpl.net. Solo dev (Pete) plus non-technical co-marketer. Targeting launch before GW1 in August 2026.

Architecture inspired by [leather-io/mono](https://github.com/leather-io/mono).

## Stack

- **Frontend:** Next.js 15 (App Router) + Expo (React Native, post-launch)
- **Styling:** Tamagui (cross-platform compiled CSS-in-JS — only styling library)
- **Backend:** Cloudflare Workers + KV (FPL proxy, caching, price predictor)
- **Auth + DB:** Supabase (Postgres + Row Level Security)
- **Payments:** Stripe (€4/mo or €25/yr Pro tier)
- **Monorepo:** Turborepo + pnpm workspaces

## Architecture

Turborepo monorepo using `pnpm`, following **clean architecture** layers:

**Presentation**: `apps/web` (Next.js 15 app router), `apps/mobile` (Expo Router), `packages/ui`
**Application**: React Query hooks in `apps/*/src/queries/`, auth hooks in `apps/*/src/hooks/`, cross-platform business logic in `packages/features`
**Domain/Logic**: `packages/fpl-client` (FPL API client + live rank + price change logic, no React)
**Types**: `packages/types` (all shared domain types — no logic here)
**Foundation**: `packages/utils` (pure helpers), `packages/tsconfig-config`, `packages/eslint-config`, `packages/prettier-config`
**Infrastructure**: `apps/worker` (Cloudflare Worker — FPL proxy + KV cache)

```
.
├── apps/
│   ├── web/                    Next.js 15 web app (primary launch target)
│   ├── mobile/                 Expo app (post-launch, not yet built)
│   └── worker/                 Cloudflare Worker (FPL proxy + KV cache)
├── packages/
│   ├── ui/                     Cross-platform components + Tamagui design tokens
│   ├── features/               React-aware business logic, hooks, orchestration
│   ├── fpl-client/             Pure FPL API client + live rank / price logic (no React)
│   ├── types/                  Shared domain types
│   ├── utils/                  Pure helpers
│   ├── tsconfig-config/        Shared TS configs
│   ├── eslint-config/          Shared ESLint config
│   └── prettier-config/        Shared Prettier config
```

### Where code goes

When implementing a new feature, decide which package each piece belongs to BEFORE writing it:

- **Pure FPL API calls, transforms, rank/price algorithms** → `packages/fpl-client` (no React)
- **React hooks, cross-feature orchestration, auth/subscription state** → `packages/features`
- **Visual components (buttons, cards, layouts, navigation)** → `packages/ui`
- **Page composition, routing, env config, app-specific layouts** → `apps/*`

If you find yourself putting business logic inside an app component, stop and move it to `features` (or `fpl-client` if it's pure). If you find yourself building UI inside `apps/web/components/`, ask whether it should be in `packages/ui` instead — most should.

### Strict package rules

#### `packages/types`

- Types only, no logic, no dependencies

#### `packages/fpl-client`

- Depends on `types` only
- No React, no React Native, no Next, no Expo
- Pure TypeScript

#### `packages/features`

- MUST NOT import from `react-native`, `next`, `expo`, or any platform-specific package
- React hooks only (e.g. `useEffect`, `useMemo`) — no platform-specific React APIs
- Pure TypeScript and React are allowed
- Test coverage matters here more than anywhere else — this is the heart of the product

#### `packages/ui`

- Cross-platform via Tamagui — single component definition works on web and native
- Use Tamagui primitives (`<XStack>`, `<YStack>`, `<Stack>`, `<Text>`, etc.) instead of raw `<View>`/`<div>`
- Reference design tokens via `$` prefix (`backgroundColor="$surface"`, `color="$t1"`)
- No business logic, no API calls, no hooks beyond UI state

#### `packages/utils`

- Pure functions, no dependencies

#### `apps/*`

- Thin shells. Compose `features` + `ui`.
- Routing, layouts, env config, platform-specific concerns only
- A page component should be ~30-50 lines on average — if it's larger, extract logic into `features` or composition into `ui`
- Apps depend on packages; packages never depend on apps

## Design system

The visual identity comes from a prototype at `apps/web/design/simplyfpl-demo.html`. The full design system reference lives in `packages/ui/DESIGN_SYSTEM.md`. Read both before building any UI component.

Key design principles:

- Linear.app-inspired — quiet, dense, information-first
- Warm neutral light theme (`#F7F7F5` bg, not stark white)
- DM Sans for UI, DM Mono for all numeric / data display
- Subtle animations only (200ms-1.2s eased)
- Borders separate, not shadows

## Development commands

```
pnpm i && pnpm build:packages
pnpm dev:web        # Next.js on :3000
pnpm dev:worker     # Wrangler on :8787
pnpm dev:mobile     # Expo dev server
```

## Code style (mirrors leather-io/mono conventions)

- No `enum` — use `const` objects or union types
- `interface` for object shapes; name component props `ComponentNameProps`
- `function` declarations for top-level functions and React components; arrow functions for callbacks only
- Destructure props in the function signature
- No `as` casts, `!` non-null assertions, or `any` — use runtime checks and type guards
- `prefer-const` everywhere
- No nested ternaries
- camelCase for variables; SCREAMING_SNAKE_CASE for module-level constants in `constants.ts` files
- Kebab-case filenames: `live-rank-view.tsx`
- Platform suffixes where needed: `.web.tsx`, `.native.tsx`, `.shared.ts`
- No `index.ts` except barrel exports from packages
- Tests co-located as `*.spec.ts`
- Conventional commits with scope: `feat(web)`, `fix(worker)`, `refactor(fpl-client)`
- Branches and PRs target `dev`, not `main`
- Imports: use the workspace alias `@simplyfpl/<pkg>` rather than relative paths across packages

## Branching + release process (simplified GitFlow)

- `main` is production. Auto-deploys to Cloudflare Pages + the Worker on every push.
- `dev` is the integration branch and the **default branch** of the repo. PRs target `dev`.
- Feature/fix/docs branches (`feat/*`, `fix/*`, `docs/*`, `chore/*`) branch from `dev` and PR back to `dev`.
- Releases are PRs from `dev` → `main`. Merge with a merge commit (preserves the per-feature history). Tag the merge commit on main `v0.X.0`.
- After a release lands on main, the next PR to dev should include a `chore: sync main into dev` merge so dev stays at-or-ahead of main.
- Hotfix exception: a true production hotfix can branch off `main` and PR to `main`, then cherry-pick back to `dev`. Use sparingly.

Branch protection is **not enforced via GitHub** (the repo is private on Free tier — branch protection rules cost Pro). Discipline replaces enforcement: don't direct-push to `main`, don't force-push either branch, don't delete `main` or `dev`.

## FPL-specific notes

- All FPL API calls must go through the Cloudflare Worker (`apps/worker`), never directly from client
- Live gameweek data refreshes every 60 seconds — respect this in query `refetchInterval`
- Bootstrap-static caches for 1 hour — safe to use `staleTime: 60 * 60 * 1000`
- Bonus points are provisional until confirmed — mark them clearly in UI
- Price calculations: FPL prices are in tenths (55 = £5.5m), use `formatPrice()` from `fpl-client`
- Captain multiplier: 2x normally, 3x with Triple Captain chip, bench boost activates bench players

## Supabase

- Client-side: `getSupabaseClient()` from `apps/web/src/lib/supabase.ts`
- Server-side (route handlers, server components): `getSupabaseServerClient()` from `apps/web/src/lib/supabase-server.ts`
- Admin (webhooks only, service role key): `getSupabaseAdminClient()`
- RLS is enabled — never bypass it except in admin client for webhooks

## Stripe

- Checkout flow: POST `/api/stripe/checkout` → redirect to Stripe → webhook updates Supabase
- Webhook handler: `apps/web/src/app/api/stripe/webhook/route.ts`
- Price IDs in env: `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`
- Never expose `STRIPE_SECRET_KEY` to client — server routes only

## What NOT to do

- Don't put fetch calls or API clients in `apps/*` — they go in `packages/fpl-client` (or `packages/features` if React-aware)
- Don't build the same component twice for web and native — use Tamagui primitives once
- Don't use `react-native` imports in `packages/features` or `packages/fpl-client`
- Don't introduce a new styling library — Tamagui is the only one
- Don't create components outside `packages/ui` unless they're genuinely app-specific (page-level layouts, error boundaries, etc.)

## Reference repos

- [leather-io/mono](https://github.com/leather-io/mono) — monorepo structure, package boundaries, scripts
- [Tamagui docs](https://tamagui.dev/docs) — primitives, tokens, themes

## Verification

Run after any code changes:

```
pnpm format
pnpm lint
pnpm typecheck
```

For a specific package:

```
pnpm --filter @simplyfpl/{package} typecheck
pnpm --filter @simplyfpl/{package} lint
```

### Pre-commit hook

`.husky/pre-commit` always runs `pnpm format` and re-stages modified files via `git add -u` before the commit object is created — regardless of whether `.env` exists. So commits land prettier-clean by default, including from scheduled agents and fresh checkouts.

If you want extra checks (typecheck, lint, etc) to run on commit, add them to `.env`:

```
PRE_COMMIT=typecheck,lint
```

`.env` is gitignored. The format-and-restage step is unconditional and not configurable — that's the whole point: CI runs `format:check`, so any unformatted file in a commit fails the `checks` job.

**Caveat for interactive `git add -p` users**: `git add -u` re-stages all modifications to tracked files, which can pull in partial-staging edits you meant to leave unstaged. Stage what you want with `git add`, then run `pnpm format && git add -u` manually before committing if you need precise control.

**Bypassing**: `--no-verify` skips the hook entirely. Reserve for the rare case where the hook itself is the bug being fixed — never as a routine workflow.
