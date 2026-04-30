# SimplyFPL Mono

FPL companion app monorepo. Built with Turborepo + pnpm workspaces.

## Apps

| App           | Description                                  |
| ------------- | -------------------------------------------- |
| `apps/web`    | Next.js 15 web app                           |
| `apps/mobile` | Expo / React Native app                      |
| `apps/worker` | Cloudflare Worker — FPL API proxy + KV cache |

## Packages

| Package                    | Description                                     |
| -------------------------- | ----------------------------------------------- |
| `packages/types`           | Shared FPL domain types                         |
| `packages/fpl-client`      | FPL API client + live rank / price change logic |
| `packages/utils`           | Pure utility functions                          |
| `packages/ui`              | Shared UI components (web + mobile)             |
| `packages/tsconfig-config` | Shared TypeScript configs                       |
| `packages/eslint-config`   | Shared ESLint config                            |
| `packages/prettier-config` | Shared Prettier config                          |

## Getting started

```bash
pnpm i
pnpm build:packages

# Start everything
pnpm dev

# Or individual apps
pnpm dev:worker   # Cloudflare Worker on :8787
pnpm dev:web      # Next.js on :3000
pnpm dev:mobile   # Expo dev server
```

## Environment variables

Copy the example files and fill in your values:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

You need:

- Supabase project URL + anon key
- Stripe publishable key, secret key, and webhook secret
- Cloudflare KV namespace IDs (from `wrangler kv:namespace create FPL_CACHE`)

## Architecture

See `CLAUDE.md` for full architectural guidance and coding conventions.

## Database

SQL migrations are in `docs/supabase/`. Run them in order via the Supabase dashboard SQL editor.

## Commits

Conventional commits with scope: `feat(web)`, `fix(worker)`, `refactor(fpl-client)`.  
PRs and branches target `dev`.
