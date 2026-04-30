# SimplyFPL — Plan & Status (snapshot)

Captured 2026-04-30 — handoff doc for picking back up. State at this point:
PR [#48](https://github.com/pete-watters/simply-fpl/pull/48) open against `dev`,
6 follow-up issues filed (#49–#54).

---

## What's done

### Branching

- `dev` branch created off `main` (didn't exist before) and pushed to origin.
- `feat/tamagui-design-system` branched off `dev`, holds all the work below.
- PR [#48](https://github.com/pete-watters/simply-fpl/pull/48) targets `dev`.

### Tamagui design system (`packages/ui`)

- 25 components matching `apps/web/design/simplyfpl-demo.html`:
  - Layout: `Nav`, `DemoBanner`, `PageShell`, `PageHeader`, `Card`, `SectionHeader`, `FNote`
  - Stats: `StatRow`, `StatCard`, `DeltaChip`, `PtsChip`, `Postag`, `ProgressBar`, `TeamPill`
  - Pitch: `Pitch`, `PitchRow`, `Player`, `Shirt`, `PBadge`, `BenchDivider`
  - Lists: `LeagueTable`, `LeagueCard`, `PriceRow`
  - Actions: `Button`, `FilterButton`, `LivePill`, `Logo`
  - Planner: `PlannerGrid`, `FdrBadge`, `ProBanner`
- `tamagui.config.ts` — DM Sans + DM Mono, full token palette (colors, spacing, radii, animations), light theme.
- `DESIGN_SYSTEM.md` — token reference, component patterns, web-vs-native notes.
- All component files marked `'use client'` (workaround for the RSC issue — see Compromises below).

### `packages/features` (new package)

- React-aware business logic / orchestration layer.
- Skeleton modules: `live-rank`, `leagues`, `prices`, `auth`, `subscriptions`.
- Depends on `@simplyfpl/fpl-client` (no duplication of API code).
- The bundle's original `fpl-api/` directory was deleted to avoid duplication with the existing `packages/fpl-client`.

### `apps/web` integration

- `apps/web/tamagui.config.ts` re-exports from `@simplyfpl/ui/tamagui.config`.
- Root `layout.tsx`: DM Sans / DM Mono via `next/font/google`, `<DemoBanner>` + `<NavBar>` wrap every page.
- `<TamaguiClientProvider>` (`'use client'`) wraps `<Providers>` (React Query) and children.
- `<NavBar>` uses `usePathname` to highlight the active link.
- 4 routes built/styled, 1 route restyled:

  | Route | View | Data |
  |---|---|---|
  | `/` | `LiveRankShowcase` | seed |
  | `/leagues` | `LeaguesShowcase` | seed |
  | `/prices` | `PricesView` | **real FPL** (worker + React Query), seed fallback |
  | `/planner` | `PlannerShowcase` | seed (Pro-gated) |
  | `/rank/[entryId]` | `LiveRankRealView` | **real FPL** (worker + React Query) |

- Demo seed data in `apps/web/src/components/demo-data.ts` mirrors the prototype HTML exactly (Salah, Haaland, Gibbingtons league, etc.).

### Patches & tooling

- **`patches/@tamagui__next-plugin.patch`** — fixes upstream Tamagui webpack-instance bug
  (`new webpack.DefinePlugin` → `new options.webpack.DefinePlugin`). Applied via
  `pnpm.patchedDependencies`. See `patches/README.md` for the full diagnosis.
- **`pnpm.overrides`** in root `package.json`:
  - `@types/react@^19` and `@types/react-dom@^19` (forces every transitive consumer to React 19 types)
  - `react-native-web@^0.21` (React 19-compatible RN-Web)
- **`.prettierrc.js`** at repo root re-exports `@simplyfpl/prettier-config`.
- **`pnpm format` / `pnpm format:check`** wired at root via prettier directly (dropped the turbo task — prettier doesn't need parallelization).
- **`.gitignore`** — added `.tamagui` (Tamagui build cache), `.vercel` (Vercel link).
- **CLAUDE.md** — merged at repo root, captures architecture, package boundaries, code style, FPL/Supabase/Stripe specifics, and verification rules.

### Verification at PR-land time

- `pnpm typecheck` — clean across all 8 packages
- `pnpm lint` — clean
- `pnpm format:check` — clean
- `pnpm build` — clean, 5 static + 1 dynamic route
- Dev smoke test — every route returns HTTP 200 with expected copy

---

## Compromises (all have a follow-up issue)

| # | What | Why | Issue |
|---|---|---|---|
| 1 | `@tamagui/next-plugin` extraction is **off** — runtime-only Tamagui | Hit React 19 + Tamagui SSR incompatibility (`createReactContext is not a function`, RSC client-call check). Small FOUC, no compile-time atomic CSS, no component flattening. | [#49](https://github.com/pete-watters/simply-fpl/issues/49) |
| 2 | `/rank/[entryId]` has `force-dynamic`, **no edge runtime** | Same root cause as #1 — Tamagui chain trips Next's RSC checks during prerender + `@floating-ui/react` (transitive Tamagui Popover dep) fails edge React polyfill. | [#51](https://github.com/pete-watters/simply-fpl/issues/51) |
| 3 | `'use client'` on `packages/ui/src/index.ts` barrel | Stops the barrel from pulling Tamagui into RSC server bundles. Side effect: zero RSC streaming for our components. | resolved by [#49](https://github.com/pete-watters/simply-fpl/issues/49) |
| 4 | Patch on `@tamagui/next-plugin` | Real upstream bug — plugin imports its own `webpack` standalone instead of using Next's vendored webpack. | [#50](https://github.com/pete-watters/simply-fpl/issues/50) |
| 5 | `/leagues` and `/planner` use seed data only | No backend wired yet. Visual demo is correct, data isn't real. | [#52](https://github.com/pete-watters/simply-fpl/issues/52), [#53](https://github.com/pete-watters/simply-fpl/issues/53) |
| 6 | Cloudflare Pages deploy unverified | Haven't tried yet. | [#54](https://github.com/pete-watters/simply-fpl/issues/54) |

---

## What's next (in order)

### Immediate

1. **Review & merge [PR #48](https://github.com/pete-watters/simply-fpl/pull/48)** into `dev`.
2. **Deploy to Cloudflare Pages** ([#54](https://github.com/pete-watters/simply-fpl/issues/54)) — first deploy will surface anything CF-specific. `/rank/[entryId]` is the most likely failure point (Node runtime instead of edge).
3. **Confirm the scheduled recheck agent** — proposed in chat, awaiting your green-light. One-time on `2026-05-14T08:00:00Z` (09:00 Dublin, Thu May 14): checks if Tamagui shipped React 19 SSR fixes; if yes, opens a PR to re-enable extraction (closes #49, #51), if no, posts an update on #49.

### Soon

4. **File upstream Tamagui bug** ([#50](https://github.com/pete-watters/simply-fpl/issues/50)) — paste the diff and reproduction from `patches/README.md` into a tamagui/tamagui issue. Drop the local patch once a release picks it up.
5. **Re-enable Tamagui extraction** ([#49](https://github.com/pete-watters/simply-fpl/issues/49) → [#51](https://github.com/pete-watters/simply-fpl/issues/51)) — the recheck agent above is designed to handle this automatically once Tamagui ships React 19 fixes.

### Feature work (post-launch foundation)

6. **Wire real data: `/leagues`** ([#52](https://github.com/pete-watters/simply-fpl/issues/52)) — needs Supabase persistence for tracked league IDs + `useTrackedLeagues()` hook.
7. **Wire real data: `/planner`** ([#53](https://github.com/pete-watters/simply-fpl/issues/53)) — needs `/fixtures` worker route, `computePlannerGrid` in `packages/features`, and Pro-gating via `useSubscription()`.
8. **Build out `packages/features` properly** — `auth`, `subscriptions`, `leagues`, `prices` modules are placeholders today. Each needs hooks + state management.

### Open architectural decisions

- **Auth flow** — Supabase magic link vs. OAuth, profile shape (`user_leagues`, `tracked_team_id`, `is_pro`).
- **Stripe** — checkout flow, webhook → Supabase sync.
- **Worker routes** — currently has `/bootstrap-static`, `/event/:id/live`, `/entry/:id`, `/entry/:id/event/:gw/picks`, `/leagues-classic/:id`. Need `/fixtures/?event=N` for the planner.
- **Mobile (`apps/mobile`)** — untouched in this PR. Tamagui components are cross-platform-ready, but Expo wiring (TamaguiProvider, fonts) hasn't been done.

---

## Useful commands

```sh
# Verify the demo end-to-end
pnpm install
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build

# Run the demo locally
pnpm dev:web         # http://localhost:3000

# Filter by package
pnpm --filter @simplyfpl/web build
pnpm --filter @simplyfpl/ui typecheck

# When updating Tamagui, drop the patch first to test cleanly
# (re-add via pnpm.patchedDependencies if still needed)

# Quick check against the prototype
open apps/web/design/simplyfpl-demo.html
```

---

## Reference

- Prototype: `apps/web/design/simplyfpl-demo.html`
- Design system docs: `packages/ui/DESIGN_SYSTEM.md`
- Architecture & code style: `CLAUDE.md` (root)
- Bundle setup history: `patches/README.md`
- Issues: [#49](https://github.com/pete-watters/simply-fpl/issues/49), [#50](https://github.com/pete-watters/simply-fpl/issues/50), [#51](https://github.com/pete-watters/simply-fpl/issues/51), [#52](https://github.com/pete-watters/simply-fpl/issues/52), [#53](https://github.com/pete-watters/simply-fpl/issues/53), [#54](https://github.com/pete-watters/simply-fpl/issues/54)
- PR: [#48](https://github.com/pete-watters/simply-fpl/pull/48)
