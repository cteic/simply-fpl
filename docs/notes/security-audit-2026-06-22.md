# Security Audit — 2026-06-22

## Advisories found

45 advisories across 10 packages (0 critical, 20 high, 22 moderate, 3 low before fixes).

| Advisory ID | CVE            | Package             | Severity | Recommended fix |
| ----------- | -------------- | ------------------- | -------- | --------------- |
| 1102341     | —              | esbuild             | Moderate | >=0.25.0        |
| 1103907     | CVE-2024-47764 | cookie              | Low      | >=0.7.0         |
| 1112659     | CVE-2026-24842 | tar                 | High     | >=7.5.7         |
| 1113300     | CVE-2026-23745 | tar                 | High     | >=7.5.3         |
| 1113375     | CVE-2026-26960 | tar                 | High     | >=7.5.8         |
| 1114200     | CVE-2026-29786 | tar                 | High     | >=7.5.10        |
| 1114302     | CVE-2026-31802 | tar                 | High     | >=7.5.11        |
| 1114680     | CVE-2026-23950 | tar                 | High     | >=7.5.4         |
| 1116229     | CVE-2026-39365 | vite                | Moderate | >=6.4.2         |
| 1117015     | CVE-2026-41305 | postcss             | Moderate | >=8.5.10        |
| 1117097     | CVE-2026-34601 | @xmldom/xmldom      | High     | >=0.8.12        |
| 1117894     | CVE-2026-41673 | @xmldom/xmldom      | High     | >=0.8.13        |
| 1117897     | CVE-2026-41674 | @xmldom/xmldom      | High     | >=0.8.13        |
| 1117900     | CVE-2026-41675 | @xmldom/xmldom      | High     | >=0.8.13        |
| 1117903     | CVE-2026-41672 | @xmldom/xmldom      | High     | >=0.8.13        |
| 1120680     | —              | esbuild             | Low      | >=0.28.1        |
| 1120730     | CVE-2026-48779 | ws                  | High     | >=8.21.0        |
| 1120742     | CVE-2026-54269 | protobufjs          | Moderate | >=7.6.3         |
| 1120744     | CVE-2026-12143 | form-data           | High     | >=3.0.5         |
| 1120782     | CVE-2026-53655 | tar                 | Moderate | >=7.5.16        |
| 1120784     | CVE-2026-53632 | vite                | Moderate | >=6.4.3         |
| 1120789     | CVE-2026-53571 | vite                | High     | >=6.4.3         |
| 1120792     | CVE-2026-53550 | js-yaml             | Moderate | >=4.2.0         |
| 1120793     | CVE-2026-49356 | @babel/core         | Low      | >=7.29.6        |
| 1120800     | —              | dompurify           | Low      | (no fix)        |
| 1120801     | —              | dompurify           | Moderate | >=3.4.7         |
| 1120802     | CVE-2026-49458 | dompurify           | Moderate | >=3.4.6         |
| 1120803     | CVE-2026-49459 | dompurify           | Moderate | >=3.4.6         |
| 1120805     | —              | dompurify           | Low      | >=3.4.9         |
| 1120812     | —              | dompurify           | Low      | >=3.4.8         |
| 1120813     | CVE-2026-49978 | dompurify           | Moderate | >=3.4.7         |
| 1120821     | CVE-2026-54285 | @opentelemetry/core | Moderate | >=2.8.0         |
| 1121167     | CVE-2026-55388 | piscina             | High     | >=4.9.3         |
| 1121187     | CVE-2026-9697  | undici              | High     | >=7.28.0        |
| 1121189     | CVE-2026-9678  | undici              | Moderate | >=7.28.0        |
| 1121192     | —              | dompurify           | Moderate | >=3.4.11        |
| 1121241     | CVE-2026-9679  | undici              | Moderate | >=7.28.0        |
| 1121242     | CVE-2026-9679  | undici              | Moderate | >=6.27.0        |
| 1121244     | CVE-2026-12151 | undici              | High     | >=7.28.0        |
| 1121245     | CVE-2026-12151 | undici              | High     | >=6.27.0        |
| 1121247     | CVE-2026-6734  | undici              | High     | >=7.28.0        |
| 1121249     | CVE-2026-6733  | undici              | Low      | >=7.28.0        |
| 1121250     | CVE-2026-6733  | undici              | Low      | >=6.27.0        |
| 1121254     | CVE-2026-11525 | undici              | Low      | >=7.28.0        |
| 1121255     | CVE-2026-11525 | undici              | Low      | >=6.27.0        |

## Patches applied

All fixes applied as `pnpm.overrides` in root `package.json` — no direct dependency version changes.

| Override     | Before   | After    | Advisories resolved                                                                                      |
| ------------ | -------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `ws`         | >=8.20.1 | >=8.21.0 | 1120730 (CVE-2026-48779, ws DoS via tiny fragments)                                                      |
| `js-yaml`    | (new)    | >=4.2.0  | 1120792 (CVE-2026-53550, quadratic DoS via merge keys)                                                   |
| `dompurify`  | (new)    | >=3.4.11 | 1120800–1120803, 1120805, 1120812, 1120813, 1121192 (8 advisories: XSS / DOM injection / hook pollution) |
| `protobufjs` | (new)    | >=7.6.3  | 1120742 (CVE-2026-54269, schema-derived name shadowing)                                                  |
| `piscina`    | (new)    | >=4.9.3  | 1121167 (CVE-2026-55388, prototype pollution RCE)                                                        |

**12 advisories resolved** (2 high, 7 moderate, 3 low).

Dependency paths for each fix:

- `ws`: `. > @supabase/supabase-js > @supabase/realtime-js > ws` and `react-native > @react-native/dev-middleware > ws`
- `js-yaml`: `. > @commitlint/cli > @commitlint/load > cosmiconfig > js-yaml`
- `dompurify`: `apps/web > posthog-js > dompurify`
- `protobufjs`: `apps/web > posthog-js > @opentelemetry/otlp-transformer > protobufjs`
- `piscina`: `apps/web > @tamagui/next-plugin > tamagui-loader > @tamagui/static-worker > piscina`

## Build status

Green — `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @simplyfpl/web build` all pass with no errors.

## Skipped — needs human triage

| Package               | Current | Fix requires | Reason skipped                                                                                                               |
| --------------------- | ------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `esbuild`             | 0.21.5  | >=0.25.0     | Transitive via `vitest > vite 5.x`; fix only in vite 6.x (major bump required)                                               |
| `esbuild`             | 0.27.3  | >=0.28.1     | Transitive via `@cloudflare/next-on-pages` and `@tamagui/next-plugin` (risky deps)                                           |
| `cookie`              | 0.5.0   | >=0.7.0      | Transitive via `@cloudflare/next-on-pages` (risky dep)                                                                       |
| `tar` (7 advisories)  | 6.2.1   | >=7.5.16     | Transitive via `expo` (risky dep)                                                                                            |
| `vite` (3 advisories) | 5.4.21  | >=6.4.3      | Transitive via `vitest`; fix only in vite 6.x (major version bump required)                                                  |
| `postcss`             | 8.4.49  | >=8.5.10     | Transitive via `expo` (risky dep)                                                                                            |
| `@xmldom/xmldom` (5)  | 0.7.13  | >=0.8.13     | Transitive via `expo` (risky dep)                                                                                            |
| `form-data`           | 3.0.4   | >=3.0.5      | Transitive via `expo` (risky dep)                                                                                            |
| `@babel/core`         | 7.29.0  | >=7.29.6     | Transitive via `react-native` (risky dep)                                                                                    |
| `@opentelemetry/core` | 2.2.0   | >=2.8.0      | Transitive via `posthog-js`; 6-minor-version jump risks breaking the opentelemetry package stack — needs manual verification |
| `undici` 7.x (7 adv)  | 7.24.8  | >=7.28.0     | Transitive via `@cloudflare/next-on-pages` (risky dep)                                                                       |
| `undici` 6.x (4 adv)  | 6.25.0  | >=6.27.0     | Transitive via `expo` (risky dep)                                                                                            |

**Note on `@opentelemetry/core`:** Path is `apps/web > posthog-js > @opentelemetry/exporter-logs-otlp-http@0.208.0 > @opentelemetry/core@2.2.0`. The posthog-js dep is not risky, but jumping `@opentelemetry/core` from 2.2.0 → 2.8.0 could break peer compatibility across the tightly-versioned opentelemetry package tree. Recommend manual upgrade of posthog-js to a version that declares a compatible opentelemetry dependency range, or an isolated override test.
