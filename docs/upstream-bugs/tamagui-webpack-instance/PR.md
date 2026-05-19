# Upstream PR draft — open on https://github.com/tamagui/tamagui

> Internal note: this file is the draft body for a PR Pete will open on the Tamagui repo
> alongside the companion issue body at [ISSUE.md](./ISSUE.md). Do **not** open it from
> this repo.

---

## Suggested title

`fix(next-plugin)`: use `options.webpack` instead of the standalone webpack instance in `DefinePlugin` / `NormalModuleReplacementPlugin`

## Summary

`@tamagui/next-plugin`'s `withTamagui` imports `webpack` at module top level and instantiates `DefinePlugin` (and `NormalModuleReplacementPlugin` under `excludeReactNativeWebExports`) against that standalone webpack instance. Next.js uses its own vendored webpack passed in via the `options.webpack` argument to the `webpack(...)` config callback. The two have structurally identical `Hook` classes but **different prototype identities**, so the plugin's `.tap(...)` calls fail with `Cannot read properties of undefined (reading 'tap')` on every Next 15 build.

This PR swaps both instantiations to `options.webpack.*` so the plugin uses the same webpack instance Next.js is running. Full root-cause writeup, trace, and a six-file self-contained repro are in the [companion issue](#companion-issue-replace-with-url-after-filing).

## Companion issue

`{REPLACE WITH FILED ISSUE URL}` — full environment, expected vs actual, stack trace down to `applyDefineKey`, related Tamagui issues, the same diff, and a `repro/` folder you can `npm install && npx next build` to reproduce the failure on a clean install.

## Diff

Source location (please confirm the path on `main`; structure-based guess from the monorepo layout):

`code/compiler/next-plugin/src/withTamagui.tsx`

```diff
-import webpack from 'webpack';
 …
 webpack: (webpackConfig, options) => {
   …
-  webpackConfig.plugins.push(new webpack.DefinePlugin(defines));
+  webpackConfig.plugins.push(new options.webpack.DefinePlugin(defines));
   …
   if (tamaguiOptions.excludeReactNativeWebExports) {
-    webpackConfig.plugins.push(new webpack.NormalModuleReplacementPlugin(/* … */));
+    webpackConfig.plugins.push(new options.webpack.NormalModuleReplacementPlugin(/* … */));
   }
   …
 }
```

After both swaps the top-level `import webpack from 'webpack'` is unused at runtime — safe to drop (or keep for types only).

## Test plan

- Build the package: `pnpm --filter @tamagui/next-plugin build` — TypeScript compiles cleanly, no API surface change.
- Smoke-test the companion repro linked from the issue:
  - **Before:** `npx next build` fails with `Cannot read properties of undefined (reading 'tap')` on five entry points.
  - **After** (the same diff applied via pnpm patch, or installing from a built fork): `npx next build` completes cleanly with the same `next.config.js`.
- We've been running this exact diff as a `pnpm patch` against `@tamagui/next-plugin@2.0.0-rc.42` in a production Next 15.4 app for several weeks — no regressions, runtime CSS path unchanged, no build-time behaviour differences.

## Risk / scope

Surface change is two `new <Plugin>(...)` calls. No behaviour change in either plugin — `options.webpack.DefinePlugin` and `webpack.DefinePlugin` are the same implementation class, sourced from the webpack instance Next.js is actually running. Backwards compatible: `options.webpack` has been part of Next.js's `webpack(config, options)` callback contract since well before Next 12, so this is safe across every supported Next version.

## Related

- Our pnpm patch ([`patches/@tamagui__next-plugin@2.0.0-rc.42.patch`](https://github.com/pete-watters/simply-fpl/blob/dev/patches/@tamagui__next-plugin@2.0.0-rc.42.patch)) — the diff this PR makes upstream.
- Same `Hook`-identity class of bug at [`pmmmwh/react-refresh-webpack-plugin#663`](https://github.com/pmmmwh/react-refresh-webpack-plugin/issues/663), [`webpack/tapable#179`](https://github.com/webpack/tapable/issues/179).
