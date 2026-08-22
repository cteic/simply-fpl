# Security Audit — 2026-08-22

`pnpm audit` found **59 advisories** (1 critical, 40 high, 25 moderate, 2 low) before patching.
After patching: **49 advisories** remain (1 critical, 35 high, 20 moderate, 2 low). **10 fixed.**

---

## Advisories found

| CVE            | Package         | Severity | Recommended fix           |
| -------------- | --------------- | -------- | ------------------------- |
| CVE-2026-64641 | next            | HIGH     | ≥15.5.21                  |
| CVE-2026-64649 | next            | HIGH     | ≥15.5.21                  |
| CVE-2026-64645 | next            | HIGH     | ≥15.5.21                  |
| CVE-2026-64648 | next            | MODERATE | ≥15.5.21                  |
| CVE-2026-64647 | next            | MODERATE | ≥15.5.21                  |
| CVE-2026-64646 | next            | MODERATE | ≥15.5.21                  |
| CVE-2026-64644 | next            | MODERATE | ≥15.5.21                  |
| CVE-2026-64643 | next            | MODERATE | ≥15.5.21                  |
| CVE-2026-59873 | tar             | CRITICAL | ≥7.5.19                   |
| CVE-2026-24842 | tar             | HIGH     | ≥7.5.7                    |
| CVE-2026-23745 | tar             | HIGH     | ≥7.5.3                    |
| CVE-2026-26960 | tar             | HIGH     | ≥7.5.8                    |
| CVE-2026-29786 | tar             | HIGH     | ≥7.5.10                   |
| CVE-2026-31802 | tar             | HIGH     | ≥7.5.11                   |
| CVE-2026-23950 | tar             | HIGH     | ≥7.5.4                    |
| CVE-2026-59874 | tar             | HIGH     | ≥7.5.18                   |
| CVE-2026-73566 | tar             | HIGH     | ≥7.5.21                   |
| CVE-2026-53655 | tar             | MODERATE | ≥7.5.16                   |
| CVE-2026-59871 | tar             | MODERATE | ≥7.5.18                   |
| CVE-2026-59875 | tar             | MODERATE | ≥7.5.17                   |
| CVE-2026-34601 | @xmldom/xmldom  | HIGH     | ≥0.8.12                   |
| CVE-2026-41672 | @xmldom/xmldom  | HIGH     | ≥0.8.13                   |
| CVE-2026-41673 | @xmldom/xmldom  | HIGH     | ≥0.8.13                   |
| CVE-2026-41674 | @xmldom/xmldom  | HIGH     | ≥0.8.13                   |
| CVE-2026-41675 | @xmldom/xmldom  | HIGH     | ≥0.8.13                   |
| CVE-2026-13697 | undici          | HIGH     | ≥7.29.0                   |
| CVE-2026-16728 | undici          | MODERATE | ≥7.29.0                   |
| CVE-2026-16729 | undici          | MODERATE | ≥7.29.0                   |
| CVE-2026-15157 | undici          | MODERATE | ≥7.29.0                   |
| CVE-2026-14643 | undici          | MODERATE | ≥7.29.0                   |
| CVE-2026-45623 | postcss         | HIGH     | ≥8.5.12                   |
| CVE-2026-73646 | postcss         | HIGH     | ≥8.5.18                   |
| CVE-2026-41305 | postcss         | MODERATE | ≥8.5.10                   |
| CVE-2026-69153 | postcss         | MODERATE | ≥8.5.23                   |
| CVE-2026-14257 | brace-expansion | HIGH     | ≥1.1.17 / ≥2.1.3 / ≥5.0.8 |
| CVE-2026-69152 | brace-expansion | HIGH     | ≥1.1.18 / ≥2.1.4 / ≥5.0.9 |
| CVE-2026-53571 | vite            | HIGH     | ≥6.4.3                    |
| CVE-2026-39365 | vite            | MODERATE | ≥6.4.2                    |
| CVE-2026-53632 | vite            | MODERATE | ≥6.4.3                    |
| CVE-2026-67214 | nanoid          | HIGH     | ≥3.3.16                   |
| CVE-2026-67213 | nanoid          | HIGH     | ≥3.3.18                   |
| CVE-2026-12143 | form-data       | HIGH     | ≥3.0.5                    |
| N/A            | sharp           | HIGH     | ≥0.35.0                   |
| CVE-2026-18446 | fast-uri        | HIGH     | ≥4.1.2                    |
| CVE-2026-69192 | ip-address      | HIGH     | ≥10.3.1                   |
| CVE-2026-69198 | ip-address      | MODERATE | ≥10.2.2                   |
| CVE-2026-54272 | ip-address      | MODERATE | ≥10.2.1                   |
| CVE-2026-56876 | extract-zip     | HIGH     | no fix available          |
| CVE-2025-71330 | image-size      | HIGH     | no fix available          |
| CVE-2025-71329 | image-size      | HIGH     | no fix available          |
| CVE-2026-73643 | js-yaml         | HIGH     | ≥5.2.2                    |
| N/A            | esbuild         | MODERATE | ≥0.25.0                   |
| N/A            | esbuild         | LOW      | ≥0.28.1                   |
| N/A            | dompurify       | MODERATE | ≥3.4.13                   |
| CVE-2024-47764 | cookie          | LOW      | ≥0.7.0                    |

---

## Patches applied

| Package                            | Before  | After    | Fixed advisories                                                                                                                                               |
| ---------------------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`                             | 15.5.19 | 15.5.23  | CVE-2026-64641 (H), CVE-2026-64649 (H), CVE-2026-64645 (H), CVE-2026-64648 (M), CVE-2026-64647 (M), CVE-2026-64646 (M), CVE-2026-64644 (M), CVE-2026-64643 (M) |
| `@typescript-eslint/eslint-plugin` | 8.65.0  | 8.67.0   | CVE-2026-14257 (H) brace-expansion v5, CVE-2026-69152 (H) brace-expansion v5                                                                                   |
| `@typescript-eslint/parser`        | 8.65.0  | 8.67.0   | (same — co-upgrade)                                                                                                                                            |
| `wrangler`                         | 4.108.0 | 4.125.0  | No advisory resolved (miniflare still carries undici 7.28.x and sharp 0.34.x)                                                                                  |
| `posthog-js`                       | 1.406.2 | 1.418.10 | No advisory resolved (1.418.10 still depends on dompurify <3.4.13)                                                                                             |
| `@cloudflare/puppeteer`            | 1.1.0   | 1.4.0    | No advisory resolved (1.4.0 still carries ip-address <10.3.1)                                                                                                  |

---

## Build status

**Green.** `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @simplyfpl/web build` all passed after patching.

---

## Skipped — needs human triage

The following advisories cannot be auto-patched and require manual review:

### Risky-dep chains (update would touch a protected package)

| CVE(s)                                 | Vulnerable pkg          | Patched version | Blocked by                                                            | Notes                                                                                        |
| -------------------------------------- | ----------------------- | --------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| CVE-2026-59873 (CRITICAL) + 8 more     | `tar`                   | ≥7.5.19–7.5.21  | `expo` → `@expo/cli`                                                  | tar is 4–5 hops deep in the expo dep chain. Fix requires bumping expo (risky).               |
| CVE-2026-34601, -41672–41675           | `@xmldom/xmldom`        | ≥0.8.12/0.8.13  | `expo` → `@expo/config-plugins` → `@expo/plist`                       | Same expo chain.                                                                             |
| CVE-2026-12143                         | `form-data`             | ≥3.0.5          | `expo` → `@expo/cli`                                                  | Same expo chain.                                                                             |
| CVE-2026-14257, CVE-2026-69152         | `brace-expansion` v1/v2 | ≥1.1.17/2.1.3   | `react-native` (via tamagui + expo)                                   | The v5 instance was fixed via @typescript-eslint; v1/v2 are locked inside react-native 0.76. |
| CVE-2026-53571, -39365, -53632         | `vite`                  | ≥6.4.2/6.4.3    | Major version jump (5→6) required; vitest 3.x peer-requires vite 5    | Needs vitest 4 + vite 6 upgrade.                                                             |
| CVE-2026-45623, -73646, -41305, -69153 | `postcss`               | ≥8.5.10–8.5.23  | `expo` → `@expo/metro-config`; `vite` major bump path                 | Same two chains as tar/vite.                                                                 |
| CVE-2026-67214, CVE-2026-67213         | `nanoid`                | ≥3.3.16/3.3.18  | `vite 5.x` → `postcss` → `nanoid`                                     | Resolved only by vite 5→6 major bump.                                                        |
| CVE-2026-18446                         | `fast-uri`              | ≥4.1.2          | `@tamagui/next-plugin` → webpack → ajv                                | @tamagui/\* is a protected package.                                                          |
| CVE-2026-73643                         | `js-yaml`               | ≥5.2.2          | `tamagui` → `react-native` → `metro` → `cosmiconfig`                  | tamagui and react-native are protected.                                                      |
| CVE-2024-47764                         | `cookie`                | ≥0.7.0          | `@cloudflare/next-on-pages` → `cookie`                                | @cloudflare/next-on-pages is a protected package.                                            |
| N/A                                    | `esbuild`               | ≥0.25.0/0.28.1  | `@tamagui/next-plugin` → webpack → esbuild; vitest → vite 5 → esbuild | Both paths blocked (tamagui/vite-major).                                                     |

### Transitive dep not updated by latest release

| CVE(s)                  | Vulnerable pkg       | Blocked direct dep                                       | Notes                                                                                          |
| ----------------------- | -------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| CVE-2026-13697 + 4 more | `undici` ≥7.29.0     | `wrangler@4.125.0` / `@cloudflare/next-on-pages@1.13.16` | miniflare in wrangler 4.125 still ships undici 7.28.x. @cloudflare/next-on-pages is protected. |
| N/A                     | `sharp` ≥0.35.0      | `wrangler@4.125.0` / `next@15.5.23`                      | miniflare in wrangler 4.125 and next 15.5.23 still ship sharp 0.34.x.                          |
| CVE-2026-69192 + 2 more | `ip-address` ≥10.2.1 | `@cloudflare/puppeteer@1.4.0`                            | puppeteer-browsers 2.x still carries socks@2.8.9 → ip-address 10.2.0.                          |
| N/A                     | `dompurify` ≥3.4.13  | `posthog-js@1.418.10`                                    | Latest posthog-js still depends on dompurify <3.4.13.                                          |

### No fix available

| CVE(s)                         | Vulnerable pkg | Notes                                                                          |
| ------------------------------ | -------------- | ------------------------------------------------------------------------------ |
| CVE-2025-71329, CVE-2025-71330 | `image-size`   | Maintainer has not released a patch. Via react-native → metro.                 |
| CVE-2026-56876                 | `extract-zip`  | No patched version published. Via @cloudflare/puppeteer → @puppeteer/browsers. |
