# Upstream issue draft — file on https://github.com/tamagui/tamagui

> Internal note: this file is the draft body for an issue Pete will open on the Tamagui
> repo, alongside the companion PR body at [PR.md](./PR.md). Do **not** open either
> from this repo.

---

## Suggested title

`@tamagui/next-plugin`: `new webpack.DefinePlugin(...)` uses standalone webpack, breaks Next 15 builds with `Cannot read properties of undefined (reading 'tap')`

## Environment

- `@tamagui/next-plugin@2.0.0-rc.42`
- `tamagui@2.0.0-rc.42`
- `@tamagui/config@2.0.0-rc.42`
- `tamagui-loader@2.0.0-rc.42` (pulls `webpack@5.106.2` as a peer)
- `next@15.4.11` (App Router, ESM `next.config.js`)
- `react@19.2.0`, `react-dom@19.2.0`
- `react-native-web@0.21.0`
- Node.js v22.22.2 on Linux x86_64
- pnpm 9.15.0 (also reproduces with npm 10.x)

Same symptom also seen on `@tamagui/next-plugin@1.144.4` + `next@15.5.x` before we upgraded.

## Expected behaviour

`next build` succeeds. The `withTamagui` wrapper compiles its own `DefinePlugin` against Next.js's vendored webpack so the parser hooks line up.

## Actual behaviour

`next build` fails during the client compiler pass with five identical errors (one per Next entry point — `app/*/page`, `app-pages-internals`, `pages/_app`, `pages/_document`, `pages/_error`, `_not-found/page`):

```
   ▲ Next.js 15.4.11

   Creating an optimized production build ...

  ➡ [tamagui] built config, components, prompt (595ms)
Failed to compile.

Module not found: TypeError: Cannot read properties of undefined (reading 'tap')

Module not found: TypeError: Cannot read properties of undefined (reading 'tap')

Module not found: TypeError: Cannot read properties of undefined (reading 'tap')

Module not found: TypeError: Cannot read properties of undefined (reading 'tap')

Module not found: TypeError: Cannot read properties of undefined (reading 'tap')


> Build failed because of webpack errors
```

Next.js 15's webpack runs in a worker and swallows the deep frames in the console output, but the failing call is in standalone webpack's `DefinePlugin`:

```
TypeError: Cannot read properties of undefined (reading 'tap')
    at applyDefineKey (node_modules/.pnpm/webpack@5.106.2_…/node_modules/webpack/lib/DefinePlugin.js:537:64)
    at .../webpack/lib/DefinePlugin.js:503:11
    at .../webpack/lib/DefinePlugin.js:441:31  ← parser.hooks.program.tap
    at NormalModule._initBuildHash (next/dist/compiled/webpack/bundle5.js …)
```

Line 537 in standalone `webpack@5.106.2/lib/DefinePlugin.js` is:

```js
parser.hooks.collectDestructuringAssignmentProperties.tap(
```

i.e. tapping a parser hook that doesn't exist on the `parser` object Next's vendored webpack creates, because the two webpacks have different `Hook` class identities.

## Root cause

`@tamagui/next-plugin/dist/{esm,cjs}/withTamagui.{mjs,cjs}` imports webpack at the module top level and uses that instance inside its `webpack(...)` callback:

```js
// dist/esm/withTamagui.mjs
import webpack from 'webpack';

// …
webpackConfig.plugins.push(new webpack.DefinePlugin(defines));
```

That `import webpack from 'webpack'` resolves to the standalone `webpack@5.106.2` declared as a peer dependency of `tamagui-loader`. Next.js doesn't run user webpack — it runs its own vendored copy at `next/dist/compiled/webpack/bundle5.js`. The two webpacks have structurally identical `Hook` classes but **different prototype identities**. When the standalone `DefinePlugin` taps parser hooks created by Next's vendored webpack, the `parser.hooks.<name>` lookups go through `Hook.HookMap` machinery from the wrong instance and return `undefined`, and `.tap(...)` throws.

The webpack instance the plugin should be using is the one Next.js passes into the config callback:

```js
nextConfig.webpack = (webpackConfig, options) => {
  // options.webpack === next/dist/compiled/webpack
  // options.isServer, options.dev, options.buildId, …
};
```

## Proposed fix (one-line per export)

```diff
diff --git a/dist/esm/withTamagui.mjs b/dist/esm/withTamagui.mjs
-        webpackConfig.plugins.push(new webpack.DefinePlugin(defines));
+        webpackConfig.plugins.push(new options.webpack.DefinePlugin(defines));

diff --git a/dist/cjs/withTamagui.cjs b/dist/cjs/withTamagui.cjs
-        webpackConfig.plugins.push(new import_webpack.default.DefinePlugin(defines));
+        webpackConfig.plugins.push(new options.webpack.DefinePlugin(defines));
```

Same swap should be done for `webpack.NormalModuleReplacementPlugin` (only reached if `excludeReactNativeWebExports` is set — defensive, but worth fixing in the same pass).

After the swap, `next build` completes cleanly with the same `next.config.js`.

## Minimal repro

A fully self-contained repro lives in [`repro/`](./repro/) of this report. To run it locally:

```sh
# clone / download just the repro/ folder, then
cd repro
npm install      # postinstall.mjs patches a separate tamagui-loader bug, see repro/README.md
npx next build   # fails with the stack trace above
```

Six files, no monorepo, no workspace deps, no transpilePackages tricks. Pinned to the exact versions listed under Environment.

The repro is also published at `docs/upstream-bugs/tamagui-webpack-instance/repro/` in the [`pete-watters/simply-fpl`](https://github.com/pete-watters/simply-fpl) repo.

## Workaround we're running in production

We're applying the diff above as a pnpm patch in our monorepo. Patch source: [`patches/@tamagui__next-plugin@2.0.0-rc.42.patch`](https://github.com/pete-watters/simply-fpl/blob/dev/patches/@tamagui__next-plugin@2.0.0-rc.42.patch). With the patch applied, our Next 15.4 app builds and ships normally, with `withTamagui` enabled (currently runtime-only — see `disableExtraction: true`; we'll flip extraction on once we're confident the upstream fix is stable).

## What we've tried

- **Dropping `withTamagui` entirely.** Works — runtime-only Tamagui via `TamaguiProvider`. Cost: ~50–100ms FOUC and we lose compile-time CSS extraction + component flattening. Tracked at [pete-watters/simply-fpl#49](https://github.com/pete-watters/simply-fpl/issues/49).
- **CJS `next.config.js`.** Suggested in similar reports ([vercel/next.js#5781](https://github.com/vercel/next.js/issues/5781), Tamagui docs note "the plugin requires CommonJS for now"). Didn't help — the same `DefinePlugin` instance mismatch happens regardless of how Next loads the config.
- **Confirming the webpack-instance identity hypothesis.** Reverting the `options.webpack.DefinePlugin` swap on a patched install reproduces the failure within seconds; applying the swap fixes it. See `feat/tamagui-1.144-extraction-experiment` and `hotfix/disable-tamagui-extraction` branches for the timeline.

## Related tamagui/tamagui issues / PRs

None of these match exactly, but they're in the same neighbourhood:

- [#1029 Tamagui Webpack Loader Error](https://github.com/tamagui/tamagui/issues/1029) — different property (`tamaguiConfig`), but also a `next-plugin` + webpack interop bug.
- [#40 HookWebpackError when running with next.js](https://github.com/tamagui/tamagui/issues/40) — older instance of "webpack hooks blow up under Next".
- [#2568 `@tamagui/next-plugin` 1.94.5 causes `ERR_UNSUPPORTED_DIR_IMPORT` in a Nx monorepo](https://github.com/tamagui/tamagui/issues/2568) — adjacent ESM/CJS resolution pain in the same plugin.
- [#3386 Next.js 15.3 Turbopack causes type errors with Expo/React Native packages](https://github.com/tamagui/tamagui/issues/3386) — different stack (Turbopack types vs. webpack hooks), same Next 15 era.

External reference patterns for the same `Hook` identity class of bugs:

- [pmmmwh/react-refresh-webpack-plugin#663](https://github.com/pmmmwh/react-refresh-webpack-plugin/issues/663)
- [webpack/tapable#179](https://github.com/webpack/tapable/issues/179)
- [vercel/next.js#5781](https://github.com/vercel/next.js/issues/5781)

## Severity / impact

Hard build failure. No partial output, no degraded mode — every Next 15 app that pulls in `@tamagui/next-plugin@2.0.0-rc.42` (or `1.144.x`) and runs `next build` hits this. The plugin is unusable on Next 15 without a patch.

## Companion PR

Filed alongside this issue: **`{REPLACE WITH PR URL AFTER OPENING}`** — applies the one-line `options.webpack.*` swap to `code/compiler/next-plugin/src/withTamagui.tsx`. PR body, diff, and test plan are in [PR.md](./PR.md). The diff has been running in production for several weeks as a `pnpm patch`; the PR just lifts it upstream.
