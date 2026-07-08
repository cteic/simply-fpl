# Security Audit 2026-07-08

## Advisories found

| CVE            | Package             | Severity | Fix                |
| -------------- | ------------------- | -------- | ------------------ |
| —              | esbuild             | moderate | ≥0.25.0            |
| —              | esbuild             | low      | ≥0.28.1            |
| CVE-2024-47764 | cookie              | low      | ≥0.7.0             |
| CVE-2026-24842 | tar                 | high     | ≥7.5.7             |
| CVE-2026-23745 | tar                 | high     | ≥7.5.3             |
| CVE-2026-26960 | tar                 | high     | ≥7.5.8             |
| CVE-2026-29786 | tar                 | high     | ≥7.5.10            |
| CVE-2026-31802 | tar                 | high     | ≥7.5.11            |
| CVE-2026-23950 | tar                 | high     | ≥7.5.4             |
| CVE-2026-53655 | tar                 | moderate | ≥7.5.16            |
| CVE-2026-39365 | vite                | moderate | ≥6.4.2             |
| CVE-2026-53632 | vite                | moderate | ≥6.4.3             |
| CVE-2026-53571 | vite                | high     | ≥6.4.3             |
| CVE-2026-41305 | postcss             | moderate | ≥8.5.10            |
| CVE-2026-34601 | @xmldom/xmldom      | high     | ≥0.8.12            |
| CVE-2026-41673 | @xmldom/xmldom      | high     | ≥0.8.13            |
| CVE-2026-41674 | @xmldom/xmldom      | high     | ≥0.8.13            |
| CVE-2026-41675 | @xmldom/xmldom      | high     | ≥0.8.13            |
| CVE-2026-41672 | @xmldom/xmldom      | high     | ≥0.8.13            |
| CVE-2026-12143 | form-data           | high     | ≥3.0.5             |
| CVE-2026-49356 | @babel/core         | low      | ≥7.29.6            |
| CVE-2026-54285 | @opentelemetry/core | moderate | ≥2.8.0             |
| CVE-2026-9697  | undici              | high     | ≥7.28.0            |
| CVE-2026-9679  | undici              | moderate | ≥7.28.0 or ≥6.27.0 |
| CVE-2026-12151 | undici              | high     | ≥7.28.0 or ≥6.27.0 |
| CVE-2026-6734  | undici              | high     | ≥7.28.0            |
| CVE-2026-6733  | undici              | low      | ≥7.28.0 or ≥6.27.0 |
| CVE-2026-11525 | undici              | low      | ≥7.28.0 or ≥6.27.0 |
| CVE-2026-9678  | undici              | moderate | ≥7.28.0            |
| CVE-2026-53655 | tar                 | moderate | ≥7.5.16            |
| CVE-2026-49356 | @babel/core         | low      | ≥7.29.6            |

33 advisories (18 high, 8 moderate, 7 low) before patching.

## Patches applied

| Package                                   | Before   | After    | Change                                         |
| ----------------------------------------- | -------- | -------- | ---------------------------------------------- |
| `wrangler` (apps/web + apps/worker)       | 4.86.0   | 4.108.0  | minor                                          |
| `@cloudflare/workers-types` (apps/worker) | ^4.0.0   | ^5.0.0   | major (types-only; required by wrangler 4.108) |
| `posthog-js` (apps/web)                   | ^1.376.0 | ^1.398.0 | minor                                          |
| `@babel/core` (apps/mobile devDep)        | ^7.0.0   | ^7.29.6  | minor                                          |
| `undici` pnpm override                    | >=6.24.0 | ^7.28.0  | tightened; forces 7.28.0 monorepo-wide         |
| `@babel/core` pnpm override               | (none)   | >=7.29.6 | new; forces 7.29.7 monorepo-wide               |

These 6 changes resolved 13 of the 33 advisories:

- `@babel/core` advisory (CVE-2026-49356) — fixed via override + mobile dep bump
- `@opentelemetry/core` advisory (CVE-2026-54285) — fixed via posthog-js 1.398.0
- 11 `undici` advisories (both 6.x and 7.x paths) — fixed via `^7.28.0` override + wrangler 4.108.0 (which no longer pulls undici 6.x through miniflare)

## Build status

Green. `pnpm typecheck`, `pnpm lint`, and `pnpm build:web` all pass.

## Skipped — needs human triage

### Risky-package paths (do not update automatically)

| Advisory                          | Transitive Path                                                            | Why skipped               |
| --------------------------------- | -------------------------------------------------------------------------- | ------------------------- |
| tar (7 CVEs, high/moderate)       | expo/expo-\* → tar                                                         | expo is frozen            |
| @xmldom/xmldom (5 CVEs, high)     | expo/expo-\* → @xmldom/xmldom                                              | expo is frozen            |
| form-data CVE-2026-12143 (high)   | expo/expo-\* → form-data                                                   | expo is frozen            |
| cookie CVE-2024-47764 (low)       | @cloudflare/next-on-pages → cookie                                         | next-on-pages is frozen   |
| postcss CVE-2026-41305 (moderate) | next / @tamagui/next-plugin / expo\* / @cloudflare/next-on-pages → postcss | all root paths are frozen |

### Requires major dep bump (needs review before upgrading)

| Advisory                                                              | Direct dep                                  | Current                    | Needed            | Blocker                                                               |
| --------------------------------------------------------------------- | ------------------------------------------- | -------------------------- | ----------------- | --------------------------------------------------------------------- |
| vite CVE-2026-39365 / CVE-2026-53632 / CVE-2026-53571 (high/moderate) | vitest (indirect via vite@5.x)              | vitest@3.2.6 + vite@5.4.21 | vite ≥6.4.3       | Requires vitest 4.x (major bump); review API changes before upgrading |
| esbuild moderate/low                                                  | vitest → vite → esbuild@0.21.5              | esbuild 0.21.5             | ≥0.25.0 / ≥0.28.1 | Same root cause as above — needs vitest 4 + vite 6                    |
| esbuild (via @cloudflare/next-on-pages)                               | @cloudflare/next-on-pages → esbuild@0.15.18 | —                          | —                 | next-on-pages is frozen                                               |

**Recommended next steps:**

1. Evaluate vitest 4.x migration — this would pull in vite 6.4.3+ and resolve the vite/esbuild advisory chain.
2. When expo is next upgraded, check if the newer release bundles tar ≥7.5.16, @xmldom/xmldom ≥0.8.13, and form-data ≥3.0.5.
