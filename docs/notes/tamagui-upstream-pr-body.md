## Problem

`@tamagui/next-plugin` crashes deterministically under Next.js 15.x with:

```
Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
    at applyDefineKey (webpack/lib/DefinePlugin.js:537:64)
```

The error fires once per entry point during the production build (every `app/*/page`, `pages/_app`, `pages/_document`, `pages/_error`, `_not-found/page`, `app-pages-internals`).

## Root cause

`withTamagui` (`code/compiler/next-plugin/src/withTamagui.ts`) did `import webpack from 'webpack'` at the top of the file and instantiated `new webpack.DefinePlugin(defines)` inside the webpack callback.

That import resolves to a **standalone `webpack@5`** (a transitive dep of `tamagui-loader`). Next.js, however, runs against its own **vendored webpack** inside `next/dist/compiled/webpack/bundle5.js`. The two have **different `Hook` class instances** — same shape, different identity.

When the standalone `DefinePlugin`'s `applyDefineKey` calls `.tap(...)` on parser hooks created by Next's vendored webpack, those hooks are undefined on the foreign instance and the build fails.

## Fix

Use the webpack instance Next.js passes into the callback via `options.webpack`:

```diff
-      webpackConfig.plugins.push(new webpack.DefinePlugin(defines))
+      webpackConfig.plugins.push(new options.webpack.DefinePlugin(defines))
```

`DefinePlugin` is the only usage of the standalone import, so the top-level `import webpack from 'webpack'` is removed entirely in this change.

## Verification

`bun run build` in `code/compiler/next-plugin` is clean. The same patch has been validated against a production Next.js 15.4 + React 19 app build (Tamagui 2.0-rc.42) applied via `pnpm.patchedDependencies` — build passes with no behavioural change, since `options.webpack.DefinePlugin` is the same API, just sourced from Next's vendored copy.
