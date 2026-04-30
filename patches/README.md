# Patches

`pnpm` applies these via `pnpm.patchedDependencies` in the root `package.json`.

## `@tamagui__next-plugin.patch`

**Affects:** `@tamagui/next-plugin@1.144.4` (with Next.js 15.x).

**Problem.** `withTamagui` does `import webpack from "webpack"` at the top of
`dist/{esm,cjs}/withTamagui.{js,mjs,cjs}` and instantiates
`new webpack.DefinePlugin(defines)` inside the webpack callback.

That import resolves to a standalone `webpack@5.106.2` (a transitive dep of
`tamagui-loader`). Next.js, however, runs against its own vendored webpack
inside `next/dist/compiled/webpack/bundle5.js`. The two have different `Hook`
class instances — same shape, different identity. When the standalone
DefinePlugin's `applyDefineKey` calls `.tap(...)` on parser hooks created by
Next's vendored webpack, those hooks are undefined on the foreign instance
and the build fails:

```
Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
    at applyDefineKey (webpack/lib/DefinePlugin.js:537:64)
```

The error fires once per entry point (every `app/*/page`, `pages/_app`,
`pages/_document`, `pages/_error`, `_not-found/page`, `app-pages-internals`).

**Fix.** Use the webpack instance Next passes into the config callback:

```diff
-webpackConfig.plugins.push(new webpack.DefinePlugin(defines))
+webpackConfig.plugins.push(new options.webpack.DefinePlugin(defines))
```

Same swap for `webpack.NormalModuleReplacementPlugin` (only reached if
`excludeReactNativeWebExports` is set — defensive).

**When to drop.** When Tamagui ships a release that uses `options.webpack`
upstream. Worth filing on https://github.com/tamagui/tamagui — the diff
is small and they likely want it.
