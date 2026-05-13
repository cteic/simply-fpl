# Tamagui SSR feasibility spike

**Date:** 2026-05-13
**Branch:** `spike/tamagui-ssr-research`
**Tamagui version on dev:** `^1.121.0`
**Note:** `tamagui.dev/docs` returned HTTP 403 during this spike. Doc sections below are based on direct inspection of the installed packages, the git history, the pnpm patch file, and knowledge of Tamagui's 1.x API surface.

---

## What was tried before

The parked branch `feat/tamagui-1.144-extraction-experiment` (single WIP commit `fa3d67e`, 2026-05-12, refs #49 #50) attempted to enable the `withTamagui` compiler plugin for full SSR style extraction. It upgraded all Tamagui packages from `^1.121.0` to `^1.144.0`, replaced the manual webpack config in `apps/web/next.config.js` with a `withTamagui()` wrapper (setting `outputCSS: './public/tamagui.css'` in prod and `disableExtraction: true` in dev), removed `'use client'` from `packages/ui/src/index.ts` (a prerequisite for the compiler to statically analyse the component tree), and dropped the local `patches/@tamagui__next-plugin.patch`. That patch fixed a webpack-instance bug: the plugin called `new import_webpack.default.DefinePlugin()` against a globally-imported webpack reference, which triggers a "multiple webpack instances" error under Next.js's webpack callback; the fix was to replace the call with `new options.webpack.DefinePlugin()` using the instance Next.js passes in. The 1.144 bump dropped the patch on the assumption that upstream merged the fix, but the commit was marked WIP and parked immediately with the note "verify whether tamagui 1.144 fixed the next-plugin webpack-instance bug (#50); if not, may need to restore patches/@tamagui\_\_next-plugin.patch" — there is no evidence the build actually ran.

---

## Current Tamagui SSR options

### Option A — Minimal SSR via `useServerInsertedHTML` (no compiler)

Next.js App Router exposes `useServerInsertedHTML` (from `next/navigation`), which lets client components inject markup into `<head>` during the SSR pass. Tamagui 1.x accumulates generated styles in an in-process registry during render; calling the registry's getter inside a `useServerInsertedHTML` callback injects those styles — theme CSS variables, media query rules, and base resets — into the initial HTML before any JS loads.

Concretely, this means modifying `TamaguiClientProvider` (already a `'use client'` component) to add the callback. The exact API call needs to be verified against the installed v1.121 — the shape is either `config.getCSS()` from the Tamagui config object or a `StyleSheet.getSheet()` call from `@tamagui/core`; both return a string of generated CSS. No build tool changes, no version bumps, no changes to `packages/ui`.

**What this fixes:** FOUC for colours, spacing tokens, and media query breakpoints — the most visible SSR gap on first paint.

**What this does not fix:** Individual component styles are still hydrated via JS. Tamagui's compiled atomic styles are not extracted to static CSS, so there is still a small flash for component-specific visual properties on very slow connections.

**Effort:** S — one file change (`apps/web/src/components/tamagui-provider.tsx`), ~15 lines, no new dependencies.

### Option B — Compiler extraction via `withTamagui` (full SSR)

`@tamagui/next-plugin` wraps Next.js's webpack config and runs the Tamagui compiler (via `tamagui-loader` and `@tamagui/static`) at build time. The compiler statically analyses every JSX element that uses Tamagui props and replaces them with pre-computed atomic CSS class names. The resulting styles are written to a CSS file (e.g. `public/tamagui.css`) that is imported in `layout.tsx` as a blocking stylesheet. The result is a smaller JS bundle (component style logic extracted entirely) and genuine zero-JS SSR rendering for styled components.

Setting `disableExtraction: true` in dev mode is essential — the compiler is too slow for HMR. In production, extraction runs fully.

The parked branch already has the `next.config.js` change and `apps/web/tamagui.config.ts` re-export in place. What is unresolved:

1. **Webpack-instance bug status.** The patch (currently in `patches/@tamagui__next-plugin.patch`) is still referenced in `package.json` and applied to the installed v1.121. It was removed in the parked branch for v1.144 but never verified. This must be confirmed before enabling the plugin: run `pnpm --filter @simplyfpl/web build` and check for a "webpack is not a constructor" or `DefinePlugin` error. If the error appears, restore the patch against v1.144 (the fix is a one-line change, same across four files).

2. **`'use client'` removal from `packages/ui/src/index.ts`.** The compiler cannot analyse a module marked `'use client'` at the barrel level. Removing it is correct for the long term (individual components that need client boundaries should declare it themselves), but it requires auditing all 30+ component exports to confirm none accidentally executes side-effects or hooks that require the client context. This is the highest-risk change in scope.

3. **CSS import in layout.** After enabling `outputCSS`, `apps/web/src/app/layout.tsx` must import the generated file (`import '../../../public/tamagui.css'`). This import must be conditional or guarded so development builds (where `outputCSS` is `null`) do not fail.

**Effort:** M — `next.config.js` change, version work on `package.json` + potential patch restoration, `packages/ui/src/index.ts` audit and change, `layout.tsx` CSS import, lockfile regeneration.

### Option C — Upgrade to Tamagui v2

The latest published version is `2.0.0-rc.42`. v2 ships a revised internals architecture with explicit RSC-safe primitives. This would be the cleanest long-term path but it is still a release candidate, the upgrade from 1.x involves breaking changes across config and theme APIs, and no validated migration path exists for this codebase. Not recommended for the August 2026 launch window.

**Effort:** L–XL.

---

## Recommended path forward

**Ship Option A for launch; revisit Option B in the first post-launch sprint.**

Option A eliminates the most user-visible SSR gap (theme variable FOUC) with a single-file change and zero build risk. The build stays as-is, CI passes, no Cloudflare Pages edge-runtime interactions to worry about. A 15-line change is a low-stakes call to make the week before GW1.

Option B is worth doing — bundle size and TTI gains from extraction are real — but it needs the webpack bug status confirmed, a careful `'use client'` audit, and a full `pnpm build` cycle to verify. That is a half-day of focused work and deserves its own branch, not a rushed pre-launch commit.

Option C is not on the table for 2026.

---

## What we'd need to change

### Option A (S)

| File                                           | Change                                                                                                                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/tamagui-provider.tsx` | Add `useServerInsertedHTML` callback to inject generated Tamagui CSS into `<head>`. Verify the exact API call against v1.121 before committing (`config.getCSS()` or `@tamagui/core`'s `StyleSheet.getSheet()`). ~15 lines. |

### Option B (M)

| File                                  | Change                                                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/next.config.js`             | Replace manual webpack config with `withTamagui()` wrapper. Re-add `react-native → react-native-web` alias inside the plugin's `components` option or a residual webpack fn. |
| `apps/web/package.json`               | Bump `tamagui` + `@tamagui/next-plugin` to `^1.144.0` (or latest 1.x).                                                                                                       |
| `packages/ui/package.json`            | Bump `tamagui`, `@tamagui/animations-react-native`, `@tamagui/shorthands`, `@tamagui/themes` to match.                                                                       |
| `packages/ui/src/index.ts`            | Remove `'use client'` — requires component-level audit first.                                                                                                                |
| `patches/@tamagui__next-plugin.patch` | Keep if 1.144 still has the bug; delete only after a passing build confirms it.                                                                                              |
| `apps/web/src/app/layout.tsx`         | Import `public/tamagui.css` in prod builds only.                                                                                                                             |
| `pnpm-lock.yaml`                      | Auto-regenerated by `pnpm i`.                                                                                                                                                |

---

## Risks

**Hydration mismatches.** Both options can produce React hydration warnings if the server-rendered HTML differs from the first client render. Tamagui uses `suppressHydrationWarning` on dynamic elements internally; the project already sets it on `<html>`. With Option A the risk is low (we're only injecting a `<style>` tag, not changing component output). With Option B, the compiler transforms JSX — any mismatch between compile-time and runtime style resolution causes a mismatch. Testing on a staging deploy, not just `next build`, is essential.

**Bundle size impact.** Option A adds ~0 bytes to the JS bundle (styles already exist, just not SSR'd). Option B can reduce the JS bundle by 20–40% for styled components, but adds a blocking CSS file to the critical path. On Cloudflare Pages with global edge delivery this is a net win, but must be measured rather than assumed.

**React Native cross-platform compat.** `packages/ui/src/index.ts` currently carries `'use client'` in part as a defensive measure for cross-platform import safety — Tamagui components use RN-style props and animation primitives that should not execute on the server. Removing it (Option B) means every component that relies on `useEffect`, `useColorScheme`, or animation hooks must be individually marked. Missing even one causes a server render crash. The mobile app (`apps/mobile`) does not import from `packages/ui/src/index.ts` directly today, but any future shared-component work depends on this boundary being clean.

**Cloudflare Pages edge runtime.** The existing `next.config.js` is careful about edge runtime compatibility. `withTamagui()` overrides the webpack config entirely — the manual `react-native → react-native-web` alias and the `DefinePlugin` for `TAMAGUI_TARGET` must be preserved or replicated inside the plugin's configuration. The edge-runtime routes (`/rank/[entryId]`, auth callback) need a passing `next build` and `wrangler pages deploy` cycle to confirm no regression.

**`@tamagui/animations-react-native` on SSR.** The animation driver is the React Native one (`createAnimations` from `@tamagui/animations-react-native`). On server render, RN animation APIs are absent. This is handled by the `TAMAGUI_TARGET=web` define (already set), but Option B's compiler path may interact differently — worth a visual check of animated components (progress bars, counters) after enabling extraction.
