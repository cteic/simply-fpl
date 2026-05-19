# Minimal repro: `@tamagui/next-plugin` webpack-instance build failure

## What this reproduces

```
Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
    at applyDefineKey (webpack/lib/DefinePlugin.js:537:64)
```

Fired once per Next entry point (`app/*/page`, `app-pages-internals`, `pages/_app`, `pages/_document`, `pages/_error`, `_not-found/page`). Build aborts before any page renders.

## Versions pinned

- `next@15.4.11`
- `react@19.2.0`, `react-dom@19.2.0`
- `tamagui@2.0.0-rc.42`
- `@tamagui/next-plugin@2.0.0-rc.42`
- `@tamagui/config@2.0.0-rc.42`
- `react-native-web@0.21.0`
- Node 22.x, pnpm 9.x or npm 10.x

## Steps

```sh
cd repro
npm install     # runs postinstall.mjs (see "Pre-existing tamagui-loader bug" below)
npx next build  # fails with the trace above
```

Use `pnpm install` if you prefer — there are no monorepo workspaces here.

## Pre-existing `tamagui-loader` bug (not the subject of this report)

The current `tamagui-loader@2.0.0-rc.42` `dist/esm/loader.mjs` resolves a non-existent `./css.js` and never falls back to the `./css.mjs` that actually ships in the package — so the build dies before the webpack-instance bug surfaces. `postinstall.mjs` adds the missing fallback so this repro can demonstrate the actual `DefinePlugin` failure. Filing that separately.

## Repro layout

```
repro/
├── next.config.js          # withTamagui wrapping a trivial NextConfig
├── tamagui.config.ts       # createTamagui(defaultConfig) from @tamagui/config/v4
├── tsconfig.json
├── postinstall.mjs         # one-line fallback patch for tamagui-loader (see above)
└── src/
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx
    └── components/
        └── hello.tsx       # 'use client'; YStack + Text from 'tamagui'
```

## Expected

`next build` completes; the home route renders the Tamagui-styled `<Hello />`.

## Actual

`next build` fails during the client compiler pass with five identical `Module not found: TypeError: Cannot read properties of undefined (reading 'tap')` messages.

## Why it happens

`@tamagui/next-plugin/dist/{esm,cjs}/withTamagui.{mjs,cjs}` does `import webpack from 'webpack'` at the top of the file and then `new webpack.DefinePlugin(defines)` inside its `webpack(...)` callback. That import resolves to the standalone `webpack@5.106.2` declared as a peer of `tamagui-loader`. Next.js, however, runs against its own vendored copy at `next/dist/compiled/webpack/bundle5.js`. The two have different `Hook` class identities — same shape, different prototypes. When the standalone `DefinePlugin.applyDefineKey` taps parser hooks created by Next's vendored webpack, the hooks it looks up by identity are `undefined`, and `.tap(...)` blows up at `DefinePlugin.js:537`.

The right webpack to use is the one Next.js passes into the config callback as `options.webpack`.

## Proposed fix

```diff
-webpackConfig.plugins.push(new webpack.DefinePlugin(defines))
+webpackConfig.plugins.push(new options.webpack.DefinePlugin(defines))
```

Same swap for `webpack.NormalModuleReplacementPlugin` (only reached when `excludeReactNativeWebExports` is set — defensive). Applied successfully as `patches/@tamagui__next-plugin@2.0.0-rc.42.patch` in the [simply-fpl repo](https://github.com/pete-watters/simply-fpl/blob/dev/patches/@tamagui__next-plugin@2.0.0-rc.42.patch).
