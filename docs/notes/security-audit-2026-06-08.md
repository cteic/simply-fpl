# Security Audit — 2026-06-08

## Advisories found

| Advisory ID | CVE            | Package        | Severity | Recommended fix |
| ----------- | -------------- | -------------- | -------- | --------------- |
| 1102341     | —              | esbuild        | Moderate | >=0.25.0        |
| 1103907     | CVE-2024-47764 | cookie         | Low      | >=0.7.0         |
| 1112496     | CVE-2026-22036 | undici         | Moderate | >=6.23.0        |
| 1112593     | CVE-2025-59471 | next           | Moderate | >=15.5.10       |
| 1112659     | CVE-2026-24842 | tar            | High     | >=7.5.7         |
| 1113300     | CVE-2026-23745 | tar            | High     | >=7.5.3         |
| 1113375     | CVE-2026-26960 | tar            | High     | >=7.5.8         |
| 1114200     | CVE-2026-29786 | tar            | High     | >=7.5.10        |
| 1114302     | CVE-2026-31802 | tar            | High     | >=7.5.11        |
| 1114594     | CVE-2026-1525  | undici         | Moderate | >=6.24.0        |
| 1114638     | CVE-2026-1526  | undici         | High     | >=6.24.0        |
| 1114640     | CVE-2026-2229  | undici         | High     | >=6.24.0        |
| 1114642     | CVE-2026-1527  | undici         | Moderate | >=6.24.0        |
| 1114680     | CVE-2026-23950 | tar            | High     | >=7.5.4         |
| 1114897     | CVE-2026-29057 | next           | Moderate | >=15.5.13       |
| 1114940     | CVE-2026-27980 | next           | Moderate | >=15.5.14       |
| 1116229     | CVE-2026-39365 | vite           | Moderate | >=6.4.2         |
| 1116376     | —              | next           | High     | >=15.5.15       |
| 1117015     | CVE-2026-41305 | postcss        | Moderate | >=8.5.10        |
| 1117097     | CVE-2026-34601 | @xmldom/xmldom | High     | >=0.8.12        |
| 1117870     | CVE-2026-6321  | fast-uri       | High     | >=3.1.1         |
| 1117884     | CVE-2026-6322  | fast-uri       | High     | >=3.1.2         |
| 1117894     | CVE-2026-41673 | @xmldom/xmldom | High     | >=0.8.13        |
| 1117897     | CVE-2026-41674 | @xmldom/xmldom | High     | >=0.8.13        |
| 1117900     | CVE-2026-41675 | @xmldom/xmldom | High     | >=0.8.13        |
| 1117903     | CVE-2026-41672 | @xmldom/xmldom | High     | >=0.8.13        |
| 1117931     | —              | next           | High     | >=15.5.16       |
| 1118939     | CVE-2026-45109 | next           | High     | >=15.5.18       |
| 1118942     | CVE-2026-44572 | next           | Low      | >=15.5.16       |
| 1118944     | CVE-2026-44581 | next           | Moderate | >=15.5.16       |
| 1118946     | CVE-2026-44582 | next           | Low      | >=15.5.16       |
| 1118948     | CVE-2026-44580 | next           | Moderate | >=15.5.16       |
| 1118950     | CVE-2026-44579 | next           | High     | >=15.5.16       |
| 1118952     | CVE-2026-44577 | next           | Moderate | >=15.5.16       |
| 1118954     | CVE-2026-44578 | next           | High     | >=15.5.16       |
| 1118956     | CVE-2026-44574 | next           | High     | >=15.5.16       |
| 1118958     | CVE-2026-44576 | next           | Moderate | >=15.5.16       |
| 1118960     | CVE-2026-44575 | next           | High     | >=15.5.16       |
| 1118962     | CVE-2026-44573 | next           | High     | >=15.5.16       |
| 1120011     | CVE-2026-47429 | vitest         | Critical | >=4.1.0         |

**Total: 40 advisories** — 1 critical, 23 high, 13 moderate, 3 low

## Patches applied

| Package  | Before | After | Method                                  |
| -------- | ------ | ----- | --------------------------------------- |
| fast-uri | 3.1.0  | 3.1.2 | `pnpm.overrides` in root `package.json` |

Path: `. > @commitlint/cli > @commitlint/load > @commitlint/config-validator > ajv > fast-uri`
CVEs resolved: CVE-2026-6321 (path traversal via percent-encoded dot segments), CVE-2026-6322 (host confusion via percent-encoded authority delimiters)

## Build status

Green — `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @simplyfpl/web build` all pass with no errors.

## Skipped — needs human triage

All remaining advisories require bumping risky packages or are only fixable via a major version jump:

| Package          | Current | Fix requires | Reason skipped                                                                                               |
| ---------------- | ------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| `next`           | 15.4.11 | >=15.5.18    | Risky dep — minor bump, 17 advisories (CVE-2025-59471, CVE-2026-29057, CVE-2026-27980, CVE-2026-44572–45109) |
| `esbuild`        | 0.21.5  | >=0.25.0     | Transitive via `vitest` and `@cloudflare/next-on-pages`; no auto-fix path                                    |
| `cookie`         | 0.5.0   | >=0.7.0      | Transitive via `@cloudflare/next-on-pages` (risky dep)                                                       |
| `undici`         | 5.29.0  | >=6.24.0     | Transitive via `@cloudflare/next-on-pages > miniflare` (risky dep)                                           |
| `tar`            | 6.2.1   | >=7.5.11     | Transitive via `expo` (risky dep) — 6 advisories                                                             |
| `vite`           | 5.4.21  | >=6.4.2      | Transitive via `vitest`; major bump required                                                                 |
| `postcss`        | 8.4.49  | >=8.5.10     | Transitive via `expo` and `next` (risky deps)                                                                |
| `@xmldom/xmldom` | 0.7.13  | >=0.8.13     | Transitive via `expo` (risky dep) — 5 advisories                                                             |
| `vitest`         | 2.1.9   | >=4.1.0      | Major bump (2.x → 4.x) — **Critical** CVE-2026-47429; prioritise this upgrade                                |

**Note on vitest (CVE-2026-47429 — Critical):** The Vitest UI server can be exploited for arbitrary file read/execute when the UI server is listening. The fix requires vitest 4.1.0, a major version bump from the current 2.1.9. Given the criticality and the scope of the major upgrade, this should be prioritised as a dedicated upgrade sprint. The advisory only applies when running the Vitest UI (`vitest --ui`), not during normal test runs or CI.
