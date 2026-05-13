# Next.js 16 Upgrade Spike

Spiked 2026-05-13 against Next.js 16.2.6 (current `latest`).

## Verdict: Blockers — do not merge upgrade yet

## Breaking changes that affect us

- **`@cloudflare/next-on-pages` hard cap** — `apps/web/package.json` devDep `@cloudflare/next-on-pages@1.13.16` declares `next: ">=14.3.0 && <=15.5.2"` as a peer constraint. Upgrading to Next 16 violates it. This is the single hardest blocker: until Cloudflare publishes a version with Next 16 support, the deployment pipeline breaks.

- **Turbopack is now the default bundler** — Next.js 16 builds with Turbopack unless `--webpack` is passed explicitly. `apps/web/next.config.ts` has a custom `webpack()` function that injects `TAMAGUI_TARGET`, `IS_STATIC`, and `__DEV__` via `DefinePlugin`, and sets the `react-native → react-native-web` alias. Running `next build` under Next 16 immediately errors: _"This build is using Turbopack, with a `webpack` config and no `turbopack` config."_ The webpack config must be migrated to Turbopack format (`turbopack.resolveAlias`, `turbopack.defineEnv`) before the upgrade lands.

- **`experimental.typedRoutes` renamed** — `apps/web/next.config.ts` uses `experimental: { typedRoutes: true }`. Next 16 promotes this to a top-level option (`typedRoutes: true`). The old key still works (emits a warning) but should be updated.

## Tamagui compatibility note

`@tamagui/next-plugin` (`^1.121.0`) isn't imported in `next.config.ts` (the webpack shim does the same job inline), so the plugin itself isn't a direct blocker. However, Tamagui's webpack-based compilation pipeline (`DefinePlugin` + `react-native` alias) depends on webpack running at all — which it won't by default in Next 16 unless the config is ported to Turbopack. The Turbopack port is non-trivial and should be tracked as its own spike. The current Tamagui v1 line (1.121.x) has not publicly confirmed Next 16 / Turbopack support; the `@tamagui/next-plugin` v2 RC (peer dep `next: >=13`) may address this but is still in RC.

## Recommended next step

1. **Watch `@cloudflare/next-on-pages`** for a release that lifts the `<=15.5.2` cap.
2. **Port the webpack config to Turbopack** (`turbopack.resolveAlias` + `turbopack.defineEnv`) in a dedicated branch — test Tamagui rendering before attempting the Next bump again.
3. **Update `experimental.typedRoutes` → `typedRoutes`** — trivial one-liner, do it in the same PR as the upgrade.
4. Re-run this spike once (1) and (2) are done. If both pass, the upgrade is clean.
