# Security Audit — 2026-05-22

`pnpm audit` found **45 advisories**. 6 were patched automatically. 39 remain and require human triage (all touch risky or pinned dependencies).

---

## Advisories found

| CVE            | Package                                  | Severity | Recommendation                                                  |
| -------------- | ---------------------------------------- | -------- | --------------------------------------------------------------- |
| CVE-2026-45773 | turbo                                    | moderate | Upgrade to ≥2.9.14                                              |
| CVE-2026-45772 | turbo                                    | low      | Upgrade to ≥2.9.14                                              |
| CVE-2026-41907 | uuid                                     | moderate | Upgrade to ≥11.1.1                                              |
| CVE-2026-45736 | ws                                       | moderate | Upgrade to ≥8.20.1                                              |
| CVE-2026-44728 | @babel/plugin-transform-modules-systemjs | high     | Upgrade to ≥7.29.4                                              |
| CVE-2026-45149 | brace-expansion                          | moderate | Upgrade to ≥5.0.6                                               |
| CVE-2025-59471 | next                                     | moderate | Upgrade to ≥15.5.10                                             |
| CVE-2026-29057 | next                                     | moderate | Upgrade to ≥15.5.13                                             |
| CVE-2026-27980 | next                                     | moderate | Upgrade to ≥15.5.14                                             |
| —              | next                                     | high     | Upgrade to ≥15.5.15                                             |
| —              | next                                     | high     | Upgrade to ≥15.5.16                                             |
| CVE-2026-45109 | next                                     | high     | Upgrade to ≥15.5.18                                             |
| CVE-2026-44572 | next                                     | low      | Upgrade to ≥15.5.16                                             |
| CVE-2026-44581 | next                                     | moderate | Upgrade to ≥15.5.16                                             |
| CVE-2026-44582 | next                                     | low      | Upgrade to ≥15.5.16                                             |
| CVE-2026-44580 | next                                     | moderate | Upgrade to ≥15.5.16                                             |
| CVE-2026-44579 | next                                     | high     | Upgrade to ≥15.5.16                                             |
| CVE-2026-44577 | next                                     | moderate | Upgrade to ≥15.5.16                                             |
| CVE-2026-44578 | next                                     | high     | Upgrade to ≥15.5.16                                             |
| CVE-2026-44574 | next                                     | high     | Upgrade to ≥15.5.16                                             |
| CVE-2026-44576 | next                                     | moderate | Upgrade to ≥15.5.16                                             |
| CVE-2026-44575 | next                                     | high     | Upgrade to ≥15.5.16                                             |
| CVE-2026-44573 | next                                     | high     | Upgrade to ≥15.5.16                                             |
| CVE-2026-41305 | postcss                                  | moderate | Upgrade to ≥8.5.10 (transitive via next)                        |
| CVE-2024-47764 | cookie                                   | low      | Upgrade to ≥0.7.0 (transitive via @cloudflare/next-on-pages)    |
| —              | esbuild                                  | moderate | Upgrade to ≥0.25.0 (transitive via @cloudflare/next-on-pages)   |
| CVE-2026-22036 | undici                                   | moderate | Upgrade to ≥6.23.0 (transitive via @cloudflare/next-on-pages)   |
| CVE-2026-1525  | undici                                   | moderate | Upgrade to ≥6.24.0 (transitive via @cloudflare/next-on-pages)   |
| CVE-2026-1526  | undici                                   | high     | Upgrade to ≥6.24.0 (transitive via @cloudflare/next-on-pages)   |
| CVE-2026-2229  | undici                                   | high     | Upgrade to ≥6.24.0 (transitive via @cloudflare/next-on-pages)   |
| CVE-2026-1527  | undici                                   | moderate | Upgrade to ≥6.24.0 (transitive via @cloudflare/next-on-pages)   |
| CVE-2026-39365 | vite                                     | moderate | Upgrade to ≥6.4.2 (transitive via vitest — requires vitest 3.x) |
| CVE-2026-24842 | tar                                      | high     | Upgrade to ≥7.5.7 (transitive via expo)                         |
| CVE-2026-23745 | tar                                      | high     | Upgrade to ≥7.5.3 (transitive via expo)                         |
| CVE-2026-26960 | tar                                      | high     | Upgrade to ≥7.5.8 (transitive via expo)                         |
| CVE-2026-29786 | tar                                      | high     | Upgrade to ≥7.5.10 (transitive via expo)                        |
| CVE-2026-31802 | tar                                      | high     | Upgrade to ≥7.5.11 (transitive via expo)                        |
| CVE-2026-23950 | tar                                      | high     | Upgrade to ≥7.5.4 (transitive via expo)                         |
| CVE-2026-34601 | @xmldom/xmldom                           | high     | Upgrade to ≥0.8.12 (transitive via expo)                        |
| CVE-2026-41673 | @xmldom/xmldom                           | high     | Upgrade to ≥0.8.13 (transitive via expo)                        |
| CVE-2026-41674 | @xmldom/xmldom                           | high     | Upgrade to ≥0.8.13 (transitive via expo)                        |
| CVE-2026-41675 | @xmldom/xmldom                           | high     | Upgrade to ≥0.8.13 (transitive via expo)                        |
| CVE-2026-41672 | @xmldom/xmldom                           | high     | Upgrade to ≥0.8.13 (transitive via expo)                        |
| CVE-2026-6321  | fast-uri                                 | high     | Upgrade to ≥3.1.1 (transitive via expo-router)                  |
| CVE-2026-6322  | fast-uri                                 | high     | Upgrade to ≥3.1.2 (transitive via expo-router)                  |

---

## Patches applied

| Package | Before | After  | Method                                                     |
| ------- | ------ | ------ | ---------------------------------------------------------- |
| turbo   | 2.9.6  | 2.9.14 | `pnpm update turbo` (direct dep, root)                     |
| uuid    | 11.0.5 | 14.0.0 | `pnpm.overrides["uuid"] = ">=11.1.1"` in root package.json |
| ws      | 8.20.0 | 8.20.1 | `pnpm.overrides["ws"] = ">=8.20.1"` in root package.json   |

Two further advisories (@babel/plugin-transform-modules-systemjs, brace-expansion) were cleared by the dependency resolution changes triggered by the turbo update.

---

## Build status

**Green.** All three checks passed after applying patches:

- `pnpm typecheck` — 8/8 tasks successful
- `pnpm lint` — 7/7 tasks successful
- `pnpm --filter @simplyfpl/web build` — completed, no errors

---

## Skipped — requires human triage

### next (17 advisories, moderate–high)

`next` is on the risky-dep list. The fix requires upgrading from `15.4.11` → `15.5.18` (minor version bump). The advisories include middleware/proxy bypasses (CVE-2026-45109, CVE-2026-44574, CVE-2026-44575, CVE-2026-44573), SSRF (CVE-2026-44578), XSS (CVE-2026-44581, CVE-2026-44580), DoS (CVE-2026-44579, CVE-2026-44577), and cache poisoning (CVE-2026-44576, CVE-2026-44582, CVE-2026-44572).

**Recommended action:** Upgrade `next` to `~15.5.18` in `apps/web/package.json`, run the full test suite, and check for breaking changes in the Next.js 15.5 changelog.

### @cloudflare/next-on-pages transitives: cookie, esbuild, undici (7 advisories)

`@cloudflare/next-on-pages` is on the risky-dep list. It pins `cookie@0.5.0`, `esbuild@0.15.18`, and `undici@5.x`. These can only be resolved by upgrading `@cloudflare/next-on-pages` or by adding targeted `pnpm.overrides` (with risk of breaking the Cloudflare Pages adapter).

### expo transitives: tar (6 high), @xmldom/xmldom (5 high)

`expo` is on the risky-dep list. These are toolchain-only packages inside `@expo/cli` used for build artefacts, not runtime code. Risk is limited to the build environment. Can be addressed in the next expo upgrade cycle.

### expo-router transitives: fast-uri (2 high)

`expo-router` is on the risky-dep list. `fast-uri` is a URI validation library used internally. Same upgrade-cycle recommendation as expo.

### react-native transitive: @babel/plugin-transform-modules-systemjs

Cleared by the turbo dependency resolution update — no longer reported by `pnpm audit`.

### vite (1 moderate — CVE-2026-39365)

`vite@5.4.21` is a transitive dep of `vitest@2.1.9`. The fix requires `vite≥6.4.2`, which is only available in vitest 3.x (a major version bump beyond the current `^2.1.9` constraint). Not auto-patched to avoid breaking the test suite. Addressed when vitest is next upgraded.

### brace-expansion (1 moderate — CVE-2026-45149)

Transitive via `@typescript-eslint/parser > minimatch@10 > brace-expansion@5.0.5`. The fix (`>=5.0.6`) cannot be applied via a blanket override — brace-expansion has incompatible APIs across major versions (v1/v2 export a function; v5 exports `{expand}`). Applying `>=5.0.6` globally breaks ESLint. Cleared from the audit report by the dep-resolution changes in this PR but may reappear. Will resolve when `@typescript-eslint` upgrades its minimatch dependency.
