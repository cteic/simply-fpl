DO NOT ADD, REMOVE, OR MODIFY COMMENTS IN CODE — including punctuation and formatting in existing comments. Only touch comments if explicitly asked.

After ANY code changes, you MUST run verification (see Verification section). Do not report a task as complete until all checks pass.

## Personal preferences

- **PRs**: title + summary bullets only. No "Generated with Claude Code" footer, no Test Plan section.
- **Commits**: no `Co-Authored-By: Claude` trailer.
- **Branches**: short kebab-case, scoped prefix when useful (`fix/...`, `ci/...`, `feat/...`).
- **Tone**: terse. Skip trailing "summary of what I just did" — the diff speaks for itself.

# SimplyFPL — Claude Instructions

SimplyFPL is an FPL companion app: Next.js web, Expo mobile, and a Cloudflare Worker proxy.

## Architecture

Turborepo monorepo using `pnpm`, following **clean architecture** layers:

**Presentation**: `apps/web` (Next.js 15 app router), `apps/mobile` (Expo Router), `packages/ui`
**Application**: React Query hooks in `apps/*/src/queries/`, auth hooks in `apps/*/src/hooks/`
**Domain/Logic**: `packages/fpl-client` (FPL API client + live rank + price change logic)
**Types**: `packages/types` (all shared domain types — no logic here)
**Foundation**: `packages/utils` (pure helpers), `packages/tsconfig-config`, `packages/eslint-config`, `packages/prettier-config`
**Infrastructure**: `apps/worker` (Cloudflare Worker — FPL proxy + KV cache)

### Key package rules
- `packages/types` — types only, no logic, no dependencies
- `packages/fpl-client` — depends on types only; no React, no RN, no Next
- `packages/utils` — pure functions, no dependencies
- `apps/web` and `apps/mobile` depend on packages; packages never depend on apps

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
