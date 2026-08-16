# Security Audit — 2026-07-22

`pnpm audit` run on lockfile after `pnpm install --frozen-lockfile`.

---

## Advisories found

34 total before patching — 1 critical, 22 high, 13 moderate, 3 low.

| Package         | CVE(s)         | Severity | Vulnerable range | Patched at |
| --------------- | -------------- | -------- | ---------------- | ---------- |
| brace-expansion | CVE-2026-13149 | HIGH     | >=2.0.0 <2.1.2   | >=2.1.2    |
| brace-expansion | CVE-2026-13149 | HIGH     | <1.1.16          | >=1.1.16   |
| brace-expansion | CVE-2026-13149 | HIGH     | >=3.0.0 <5.0.7   | >=5.0.7    |
| js-yaml         | CVE-2026-59868 | MODERATE | >=5.0.0 <=5.1.0  | >=5.2.0    |
| js-yaml         | CVE-2026-59870 | MODERATE | >=5.0.0 <=5.2.0  | >=5.2.1    |
| fast-uri        | CVE-2026-13676 | HIGH     | >=3.0.0 <3.1.3   | >=3.1.3    |
| fast-uri        | CVE-2026-16221 | HIGH     | >=3.0.0 <=3.1.3  | >=3.1.4    |
| dompurify       | —              | LOW      | <=3.4.11         | >=3.4.12   |
| shell-quote     | CVE-2026-13311 | HIGH     | <=1.8.4          | >=1.9.0    |
| tar             | CVE-2026-59873 | CRITICAL | <=7.5.18         | >=7.5.19   |
| tar             | CVE-2026-24842 | HIGH     | <7.5.7           | >=7.5.7    |
| tar             | CVE-2026-23745 | HIGH     | <=7.5.2          | >=7.5.3    |
| tar             | CVE-2026-26960 | HIGH     | <7.5.8           | >=7.5.8    |
| tar             | CVE-2026-29786 | HIGH     | <=7.5.9          | >=7.5.10   |
| tar             | CVE-2026-31802 | HIGH     | <=7.5.10         | >=7.5.11   |
| tar             | CVE-2026-23950 | HIGH     | <=7.5.3          | >=7.5.4    |
| tar             | CVE-2026-59874 | HIGH     | <=7.5.17         | >=7.5.18   |
| tar             | CVE-2026-53655 | MODERATE | <=7.5.15         | >=7.5.16   |
| tar             | CVE-2026-59875 | MODERATE | <=7.5.16         | >=7.5.17   |
| tar             | CVE-2026-59871 | MODERATE | <=7.5.17         | >=7.5.18   |
| @xmldom/xmldom  | CVE-2026-34601 | HIGH     | <0.8.12          | >=0.8.12   |
| @xmldom/xmldom  | CVE-2026-41673 | HIGH     | <0.8.13          | >=0.8.13   |
| @xmldom/xmldom  | CVE-2026-41674 | HIGH     | <0.8.13          | >=0.8.13   |
| @xmldom/xmldom  | CVE-2026-41675 | HIGH     | <0.8.13          | >=0.8.13   |
| @xmldom/xmldom  | CVE-2026-41672 | HIGH     | <0.8.13          | >=0.8.13   |
| form-data       | CVE-2026-12143 | HIGH     | >=3.0.0 <3.0.5   | >=3.0.5    |
| vite            | CVE-2026-39365 | MODERATE | <=6.4.1          | >=6.4.2    |
| vite            | CVE-2026-53632 | MODERATE | <=6.4.2          | >=6.4.3    |
| vite            | CVE-2026-53571 | HIGH     | <=6.4.2          | >=6.4.3    |
| esbuild         | —              | MODERATE | <=0.24.2         | >=0.25.0   |
| esbuild         | —              | LOW      | >=0.27.3 <0.28.1 | >=0.28.1   |
| postcss         | CVE-2026-41305 | MODERATE | <8.5.10          | >=8.5.10   |
| cookie          | CVE-2024-47764 | LOW      | <0.7.0           | >=0.7.0    |
| sharp           | —              | HIGH     | <0.35.0          | >=0.35.0   |

---

## Patches applied

9 advisories resolved.

| Change                                    | Before             | After              | Method                                                                                  |
| ----------------------------------------- | ------------------ | ------------------ | --------------------------------------------------------------------------------------- |
| @typescript-eslint/eslint-plugin + parser | ^8.0.0 / 8.59.1    | ^8.65.0 / 8.65.0   | `pnpm update` in packages/eslint-config — pulls minimatch@10 with brace-expansion@5.0.7 |
| eslint                                    | ^9.0.0 / 9.39.4    | ^9.39.5 / 9.39.5   | `pnpm update` at root — pulls brace-expansion@1.1.16 for eslint internals               |
| brace-expansion (expo/minimatch@9 tree)   | 2.1.0              | 2.1.2              | resolved automatically via lockfile refresh alongside above                             |
| pnpm.overrides: fast-uri                  | >=3.1.2            | >=3.1.4            | override tightened (was below patched threshold for CVE-2026-16221)                     |
| pnpm.overrides: shell-quote               | >=1.8.4            | >=1.9.0            | override tightened (was below patched threshold for CVE-2026-13311)                     |
| pnpm.overrides: js-yaml                   | >=4.2.0            | >=5.2.1            | override tightened — previous floor allowed js-yaml@5.0.0 which is vulnerable           |
| pnpm.overrides: dompurify                 | >=3.4.11           | >=3.4.12           | override tightened (was below patched threshold)                                        |
| posthog-js                                | ^1.398.0 / 1.398.2 | ^1.406.2 / 1.406.2 | `pnpm update` in apps/web                                                               |
| vitest                                    | ^3.2.6             | ^3.2.7             | `pnpm update` at root                                                                   |

---

## Build status

Green. `pnpm typecheck`, `pnpm lint`, `pnpm --filter @simplyfpl/web build` all pass.

---

## Skipped — risky dep chains (need expo/next/@tamagui update)

All paths below go through a dep on the risky list (`expo`, `next`, `react-native`, `@tamagui/*`, `@cloudflare/next-on-pages`). They require a major or minor version bump of the risky dep to resolve.

| Package             | CVE(s)                                                                                                                                                                                    | Severity               | Blocking dep                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------- |
| tar (×9 advisories) | CVE-2026-59873 (CRITICAL), CVE-2026-24842, CVE-2026-23745, CVE-2026-26960, CVE-2026-29786, CVE-2026-31802, CVE-2026-23950, CVE-2026-59874, CVE-2026-53655, CVE-2026-59875, CVE-2026-59871 | CRITICAL/HIGH/MODERATE | `expo@52` → `@expo/cli` → tar@6.2.1                             |
| @xmldom/xmldom (×5) | CVE-2026-34601, CVE-2026-41672 through 41675                                                                                                                                              | HIGH                   | `expo@52` → `@expo/cli` → `@expo/plist` → @xmldom/xmldom@0.7.13 |
| form-data           | CVE-2026-12143                                                                                                                                                                            | HIGH                   | `expo@52` → `@expo/cli` → form-data@3.0.4                       |
| postcss             | CVE-2026-41305                                                                                                                                                                            | MODERATE               | `expo@52` → `@expo/metro-config` → postcss@8.4.49               |
| sharp               | —                                                                                                                                                                                         | HIGH                   | `next@15` → sharp@0.34.5                                        |
| cookie              | CVE-2024-47764                                                                                                                                                                            | LOW                    | `@cloudflare/next-on-pages` → cookie@0.5.0                      |
| esbuild (LOW)       | —                                                                                                                                                                                         | LOW                    | `@tamagui/next-plugin` → `@tamagui/static` → esbuild@0.27.3     |

## Skipped — require vitest major version bump

These go through `@amiceli/vitest-cucumber@4.7.0 → vitest@3.2.6 → vite@5.4.21`. Vite 5.x has no backport for these CVEs; fixes only exist in vite ≥6.4.2/6.4.3 (vitest 4.x). Upgrading vitest 3→4 is a major bump outside the declared `^3.x` range.

| Package | CVE(s)         | Severity |
| ------- | -------------- | -------- |
| vite    | CVE-2026-39365 | MODERATE |
| vite    | CVE-2026-53632 | MODERATE |
| vite    | CVE-2026-53571 | HIGH     |
| esbuild | —              | MODERATE |
