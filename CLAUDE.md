# SimplyFPL — Claude Instructions

SimplyFPL is a freemium FPL (Fantasy Premier League) companion app — a faster, cleaner alternative to livefpl.net. Solo dev (Pete) plus non-technical co-marketer. Targeting launch before GW1 in August 2026.

Architecture inspired by [leather-io/mono](https://github.com/leather-io/mono).

## Scoped instruction files

This file covers the repo. Packages with their own hard boundaries state them in
their own `CLAUDE.md`, which applies to everything beneath it and wins over this
file inside its subtree:

- `apps/web/CLAUDE.md` — app shell, Supabase, Stripe, E2E
- `apps/worker/CLAUDE.md` — FPL proxy and cache
- `packages/features/CLAUDE.md` — no platform imports; testing bar
- `packages/fpl-client/CLAUDE.md` — pure domain logic
- `packages/ui/CLAUDE.md` — Tamagui and design tokens

`AGENTS.md` is a symlink to `CLAUDE.md` at every level, so tools reading either
name get the same rules. Never create a second real file — edit the CLAUDE.md.

Standing rules that apply everywhere — attribution, commit authorship,
confidentiality, secrets, verification before "done" — are global and are
deliberately not repeated here.

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

### Package rules

Each package states its own rules in its `CLAUDE.md`, which applies to
everything under that directory:

| Package               | Holds                          | Hard boundary                              |
| --------------------- | ------------------------------ | ------------------------------------------ |
| `packages/types`      | shared domain types            | types only, no logic, no deps              |
| `packages/fpl-client` | FPL client, rank + price logic | depends on `types` only; no React          |
| `packages/features`   | React-aware business logic     | no platform-specific imports               |
| `packages/ui`         | cross-platform components      | Tamagui only; no business logic            |
| `packages/utils`      | pure helpers                   | pure functions, no deps                    |
| `apps/*`              | routing, layouts, env config   | thin shells; packages never depend on apps |

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

## Code style — repo-specific

General TypeScript style is global; these are the rules particular to this repo.

- camelCase for variables; SCREAMING_SNAKE_CASE for module-level constants in `constants.ts` files
- Platform suffixes where needed: `.web.tsx`, `.native.tsx`, `.shared.ts`
- No `index.ts` except barrel exports from packages
- Conventional commits with scope: `feat(web)`, `fix(worker)`, `refactor(fpl-client)`
- Branches and PRs target `dev`, not `main`
- Imports: use the workspace alias `@simplyfpl/<pkg>` rather than relative paths across packages
- i18n: any new key added to `packages/i18n/src/locales/en.json` MUST be added with a real translation to every other locale file in that directory — the key-parity spec fails the i18n suite otherwise. Non-English locales load lazily via `loadLocale`; never import them statically.

## Branching + release process (simplified GitFlow)

- `main` is production. Auto-deploys to Cloudflare Workers (web + the API worker) on every push.
- `dev` is the integration branch and the **default branch** of the repo. PRs target `dev`.
- Feature/fix/docs branches (`feat/*`, `fix/*`, `docs/*`, `chore/*`) branch from `dev` and PR back to `dev`.
- **No stacked PRs.** Every PR branches off `dev` and targets `dev` directly — never branch a PR off another open PR's branch. Stacked PRs have repeatedly stranded work here: a PR gets merged into its parent branch instead of `dev`, the parent is then superseded, and the commits never reach `dev`/`main`. When several pieces of work are genuinely shared or dependent, put them in **one larger PR off `dev` with separate, well-scoped commits** rather than a stack.
- Releases are PRs from `dev` → `main`. Merge with a merge commit (preserves the per-feature history). Tag the merge commit on main `v0.X.0`.
- After a release lands on main, the next PR to dev should include a `chore: sync main into dev` merge so dev stays at-or-ahead of main.
- Hotfix exception: a true production hotfix can branch off `main` and PR to `main`, then cherry-pick back to `dev`. Use sparingly. Run `/hotfix` (see `.claude/commands/hotfix.md`) to automate the flow.

Branch protection is **not enforced via GitHub** (the repo is private on Free tier — branch protection rules cost Pro). Discipline replaces enforcement: don't direct-push to `main`, don't force-push either branch, don't delete `main` or `dev`.

## FPL-specific notes

- All FPL API calls must go through the Cloudflare Worker (`apps/worker`), never directly from client
- Captain multiplier: 2x normally, 3x with Triple Captain chip, bench boost activates bench players

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

### Diff-grep before every code-touching push

Local `pnpm lint` is unreliable on Pete's machine (issue #157 — OOM/hang on prettier-plugin-sort-imports), so violations have slipped past pre-commit and been caught by CI several times. Until #157 is fixed, every push that adds or modifies source code must grep its own diff for the forbidden patterns:

```
git diff origin/<base>..HEAD -- 'apps/' 'packages/' 'tests/' | \
  grep -nE '\!\.[A-Za-z_$]|: any\b|\benum |^\+.* as [A-Z]'
```

If anything matches, fix locally before pushing. Nested ternaries don't grep cleanly — scan the diff visually for `? ... ? ... :` shapes. This is on top of the pre-commit/pre-push hooks, not a replacement.

This applies equally to interactive sessions, scheduled remote agents, and human dev work.

### Git hooks (pre-commit + pre-push)

- **`.husky/pre-commit`** runs `lint-staged` — prettier --write on staged files only (~1s). lint-staged re-stages the formatted versions automatically. Unstaged files in the working tree are never touched, so `git add -p` partial-staging works as expected.
- **`.husky/pre-push`** runs `pnpm format:check` (read-only) on the whole repo. This is the safety net for anything that slipped past the pre-commit hook (e.g. cherry-picked commits, partial-staging hunks, scheduled agents). If it fails: run `pnpm format`, commit the fix, and re-push.

Optional extra checks per hook via `.env`:

```
PRE_COMMIT=typecheck,lint
PRE_PUSH=typecheck,lint,test:unit
```

`.env` is gitignored.

**Bypassing**: `--no-verify` skips the hook entirely. Reserve for genuine emergencies (e.g. prod-down hotfix with local tooling hung). Never as a routine workflow.

## Testing

BDD tests use Gherkin `.feature` files with step definitions in `*.steps.ts`.

- **Unit/integration**: Vitest + `@amiceli/vitest-cucumber` + MSW. Co-locate `.feature` and `*.spec.ts` next to source.
- **E2E**: Playwright + `playwright-bdd` in `apps/web/e2e/features/`. Runs on push to `main` only.
- **MSW**: all FPL API calls in tests go through MSW — never hit real FPL or the Worker in tests.

### Rule for new features

Every PR that adds a new feature or user-facing flow MUST include:

- At least one `.feature` scenario describing the user-observable behaviour.
- Step definitions and any required MSW handlers.
- For E2E-worthy flows (anything reachable from primary navigation), add a Playwright BDD scenario too.

Bug-fix PRs MUST include a regression test that fails without the fix.

A PR without tests for new behaviour will be rejected at review. The agent opening the PR is responsible for writing the tests — don't defer.
