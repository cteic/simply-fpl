# Tamagui upstream PR draft

Local draft to copy/paste when filing the fix for the `@tamagui/next-plugin`
webpack-instance bug. Tracks issue #50 in this repo.

This doc is just notes — nothing in here goes upstream until you do it yourself.

## Two paths

**Path A — open a PR (better outcome, more setup).** Forks the repo, edits the
source file, opens a code change they can merge directly.

**Path B — file an issue (faster, no fork).** Describes the bug + fix; lets
them apply the change themselves.

Either works. Pick whichever fits your time.

---

## Path A — Open a PR against `tamagui/tamagui`

### Steps

```bash
# 1. Fork via the UI: https://github.com/tamagui/tamagui → "Fork"

# 2. Clone your fork
git clone git@github.com:pete-watters/tamagui.git tamagui-upstream
cd tamagui-upstream

# 3. Branch off main
git checkout -b fix/next-plugin-webpack-instance

# 4. Find the source — typical monorepo layout puts it at:
#    code/packages/next-plugin/src/withTamagui.ts
#    (verify the exact path; tamagui/tamagui's tree shifts occasionally)
$EDITOR code/packages/next-plugin/src/withTamagui.ts

# 5. Make the change (see "The diff" below)

# 6. Build the plugin locally to sanity-check it still compiles
cd code/packages/next-plugin
yarn build  # or npm run build — check their package.json

# 7. Commit + push to your fork
cd ../../..
git add -A
git commit -m "fix(next-plugin): use options.webpack instead of imported webpack

The DefinePlugin and NormalModuleReplacementPlugin instances need to come
from Next.js's vendored webpack (passed in via options.webpack), not the
standalone webpack@5 that next-plugin imports at the top of withTamagui.

Without this, Next.js 15.x builds crash with:

  Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
      at applyDefineKey (webpack/lib/DefinePlugin.js:537:64)

— because the imported webpack and Next's vendored webpack have different
Hook class instances, and the standalone DefinePlugin's parser-hook taps
are undefined on the foreign instance."

git push -u origin fix/next-plugin-webpack-instance

# 8. Open the PR — `gh` defaults to the upstream base when you've pushed
#    to a fork. You'll get the URL to paste into the browser.
gh pr create --repo tamagui/tamagui --base main \
  --title "fix(next-plugin): use options.webpack instead of the imported webpack instance" \
  --body-file ../simply-fpl/docs/notes/tamagui-upstream-pr.md  # or paste body manually
```

### The diff

Source file (TypeScript, in their repo — the patches in our repo show the
compiled output, but the same line exists in source):

```diff
-      webpackConfig.plugins.push(new webpack.DefinePlugin(defines));
+      webpackConfig.plugins.push(new options.webpack.DefinePlugin(defines));
```

`options.webpack` is already destructured out of the webpack-callback
parameter that Next.js passes in — see how Next.js docs describe
`webpack(config, options)`. Same swap for `webpack.NormalModuleReplacementPlugin`
if it appears (only used when `excludeReactNativeWebExports` is set).

You can also drop the top-of-file `import webpack from 'webpack'` once the
two usages are gone — removes the standalone webpack as a runtime dep.

### Suggested PR title

```
fix(next-plugin): use options.webpack instead of the imported webpack instance
```

### Suggested PR body

```markdown
## Problem

`@tamagui/next-plugin@2.0.0-rc.42` (and earlier `1.144.x`) crashes deterministically under Next.js 15.x with:

\`\`\`
Module not found: TypeError: Cannot read properties of undefined (reading 'tap')
at applyDefineKey (webpack/lib/DefinePlugin.js:537:64)
\`\`\`

The error fires once per entry point during the production build (every `app/*/page`, `pages/_app`, `pages/_document`, `pages/_error`, `_not-found/page`, `app-pages-internals`).

## Root cause

`withTamagui` does `import webpack from 'webpack'` at the top of the file and instantiates `new webpack.DefinePlugin(defines)` inside the webpack callback.

That import resolves to a **standalone `webpack@5`** (a transitive dep of `tamagui-loader`). Next.js, however, runs against its own **vendored webpack** inside `next/dist/compiled/webpack/bundle5.js`. The two have **different `Hook` class instances** — same shape, different identity.

When the standalone `DefinePlugin`'s `applyDefineKey` calls `.tap(...)` on parser hooks created by Next's vendored webpack, those hooks are undefined on the foreign instance and the build fails.

## Fix

Use the webpack instance Next.js passes into the callback via `options.webpack`:

\`\`\`diff

-      webpackConfig.plugins.push(new webpack.DefinePlugin(defines));

*      webpackConfig.plugins.push(new options.webpack.DefinePlugin(defines));
  \`\`\`

Same swap for `webpack.NormalModuleReplacementPlugin` (only reached if `excludeReactNativeWebExports` is set — defensive).

With this in place, the top-level `import webpack from 'webpack'` can be removed entirely.

## Verification

I've been running this patch via `pnpm.patchedDependencies` in production-bound app builds since [date / GW] — Next.js 15.4 + React 19, Tamagui 2.0-rc.42. Build is clean; no behavioural change because `options.webpack` IS the same `DefinePlugin` API, just sourced from Next's vendored copy.
```

---

## Path B — File an issue instead

If you'd rather not fork + build:

```bash
gh issue create --repo tamagui/tamagui \
  --title "next-plugin crashes on Next 15: DefinePlugin uses wrong webpack instance" \
  --body-file - <<'EOF'
(paste the PR body above — same content, just framed as a bug report)
EOF
```

The maintainers will likely apply the one-liner themselves.

---

## Before you file — duplicate check

Quick search of github.com/tamagui/tamagui issues for any of:

- `applyDefineKey`
- `DefinePlugin` + `tap`
- `next-plugin` + `webpack instance`
- `Cannot read properties of undefined (reading 'tap')`

If there's an open report, +1 on it and link our patch in a comment instead of filing a new one.

---

## After it merges upstream

1. Bump `@tamagui/next-plugin` to the release that contains the fix.
2. Remove the relevant entries from `patches/` (start with `@tamagui__next-plugin@2.0.0-rc.42.patch` and `@tamagui__next-plugin.patch`).
3. Remove the corresponding `pnpm.patchedDependencies` entries from the root `package.json`.
4. Verify `pnpm install && pnpm --filter @simplyfpl/web build` still passes.
5. Close issue #50 with a link to the upstream release.
