# Security Audit — 2026-11-22

## Advisories found

| Advisory ID | CVE             | Package                 | Severity     | Patched version |
| ----------- | --------------- | ----------------------- | ------------ | --------------- |
| 1112659     | CVE-2026-24842  | tar                     | high         | >=7.5.7         |
| 1113300     | CVE-2026-23745  | tar                     | high         | >=7.5.3         |
| 1113375     | CVE-2026-26960  | tar                     | high         | >=7.5.8         |
| 1114200     | CVE-2026-29786  | tar                     | high         | >=7.5.10        |
| 1114302     | CVE-2026-31802  | tar                     | high         | >=7.5.11        |
| 1114680     | CVE-2026-23950  | tar                     | high         | >=7.5.4         |
| 1117097     | CVE-2026-34601  | @xmldom/xmldom          | high         | >=0.8.12        |
| 1117894     | CVE-2026-41673  | @xmldom/xmldom          | high         | >=0.8.13        |
| 1117897     | CVE-2026-41674  | @xmldom/xmldom          | high         | >=0.8.13        |
| 1117900     | CVE-2026-41675  | @xmldom/xmldom          | high         | >=0.8.13        |
| 1117903     | CVE-2026-41672  | @xmldom/xmldom          | high         | >=0.8.13        |
| 1120680     | N/A             | esbuild                 | low          | >=0.28.1        |
| 1120782     | CVE-2026-53655  | tar                     | moderate     | >=7.5.16        |
| 1123939     | CVE-2026-59871  | tar                     | moderate     | >=7.5.18        |
| 1123940     | CVE-2026-59873  | tar                     | **critical** | >=7.5.19        |
| 1123941     | CVE-2026-59874  | tar                     | high         | >=7.5.18        |
| 1123942     | CVE-2026-59875  | tar                     | moderate     | >=7.5.17        |
| 1145647     | CVE-2026-73566  | tar                     | high         | >=7.5.21        |
| 1147955     | CVE-2026-45822  | decode-uri-component    | moderate     | >=0.5.0         |
| 1153169     | CVE-2026-9358   | postcss-selector-parser | low          | >=7.1.3         |
| 1158506     | CVE-2026-82562  | qs                      | moderate     | >=6.16.0        |
| 1158507     | CVE-2026-82417  | qs                      | moderate     | >=6.16.0        |
| 1158518     | CVE-2026-83610  | @xmldom/xmldom          | moderate     | >=0.8.15        |
| 1164786     | CVE-2026-45820  | fflate                  | moderate     | >=0.4.9         |
| 1193683     | CVE-2026-84373  | vitest                  | moderate     | >=4.1.11        |
| 1193684     | CVE-2026-84373  | @vitest/mocker          | moderate     | >=4.1.11        |
| 1193689     | CVE-2026-83607  | @xmldom/xmldom          | high         | >=0.8.14        |
| 1193692     | CVE-2026-83605  | @xmldom/xmldom          | high         | >=0.8.14        |
| 1193696     | CVE-2026-83616  | @xmldom/xmldom          | high         | >=0.8.15        |
| 1193700     | CVE-2026-83608  | @xmldom/xmldom          | high         | >=0.8.15        |
| 1193705     | CVE-2026-83611  | @xmldom/xmldom          | moderate     | >=0.8.15        |
| 1193708     | CVE-2026-83613  | @xmldom/xmldom          | high         | >=0.8.15        |
| 1193709     | CVE-2026-83619  | @xmldom/xmldom          | high         | >=0.8.15        |
| 1193712     | CVE-2026-83615  | @xmldom/xmldom          | high         | >=0.8.15        |
| 1193715     | CVE-2026-83614  | @xmldom/xmldom          | high         | >=0.8.15        |
| 1239765     | CVE-2025-71329  | image-size              | high         | >=2.0.3         |
| 1239766     | CVE-2025-71330  | image-size              | high         | >=2.0.3         |
| 1241260     | CVE-2026-104848 | tinypool                | **critical** | >=2.1.1         |
| 1241261     | CVE-2026-104849 | tinypool                | **critical** | >=2.1.2         |
| 1242767     | CVE-2026-112949 | @vitest/mocker          | moderate     | >=4.1.12        |
| 1243380     | CVE-2026-104844 | postcss-selector-parser | moderate     | >=7.1.6         |
| 1243687     | CVE-2026-110816 | qs                      | moderate     | >=6.16.1        |
| 1243857     | CVE-2026-118664 | decode-uri-component    | high         | >=0.5.1         |
| 1244013     | CVE-2026-118773 | glob                    | moderate     | >=14.0.2        |
| 1244623     | CVE-2026-118764 | minimatch               | moderate     | >=11.0.1        |

## Patches applied

- `@react-navigation/native` 7.2.2 → 7.5.2 (resolves decode-uri-component CVE-2026-45822, CVE-2026-118664)
- `postcss-selector-parser` 7.1.1 → 7.2.1 (resolves CVE-2026-9358, CVE-2026-104844)
- `qs` 6.15.3 → 6.17.1 (resolves CVE-2026-82562, CVE-2026-82417, CVE-2026-110816)
- `fflate` 0.4.8 → 0.4.9 (resolves CVE-2026-45820)

## Build status

**Green** — `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @simplyfpl/web build` all passed after the patches.

## Skipped

The following advisories cannot be auto-fixed without bumping a risky or constrained dependency, or require a major-version change:

### Risky-dep chains (require bumping a protected package)

| Advisory group                                                                         | Vulnerable package      | Fixed in | Why skipped                                                                                                                           |
| -------------------------------------------------------------------------------------- | ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| tar (12 advisories: CVE-2026-24842 et al.)                                             | `tar@6.2.1`             | >=7.5.21 | Reachable only through `expo@52.x` → `@expo/cli`. Fixing requires bumping `expo` (protected). Major-version bump to tar (6→7) needed. |
| @xmldom/xmldom (15 advisories: CVE-2026-34601 et al.)                                  | `@xmldom/xmldom@0.7.13` | >=0.8.15 | Reachable only through `expo@52.x` → `@expo/plist`. Fixing requires bumping `expo` (protected).                                       |
| esbuild (1 advisory, CVE-2026-120680)                                                  | `esbuild@0.27.3`        | >=0.28.1 | Reachable only through `@tamagui/next-plugin@2.4.0` → `@tamagui/static` (protected `@tamagui/*` dep).                                 |
| image-size (2 advisories: CVE-2025-71329, CVE-2025-71330)                              | `image-size@1.2.1`      | >=2.0.3  | Reachable only through `react-native@0.76.0` → `metro` (protected dep).                                                               |
| decode-uri-component via expo-router (covered by @react-navigation/native patch above) | —                       | —        | —                                                                                                                                     |

### Major-version bumps on non-risky packages (need human review)

| Advisory                         | Vulnerable package      | Current | Needed              | Risk                                                                                       |
| -------------------------------- | ----------------------- | ------- | ------------------- | ------------------------------------------------------------------------------------------ |
| CVE-2026-84373, CVE-2026-112949  | vitest / @vitest/mocker | 3.2.x   | >=4.1.11 / >=4.1.12 | Major semver jump (3→4). Vitest 4.x has breaking API changes. All workspaces pin `^3.2.x`. |
| CVE-2026-104848, CVE-2026-104849 | tinypool                | 1.1.1   | >=2.1.2             | Transitive dep of vitest; major jump (1→2). Fixed by upgrading vitest.                     |
| CVE-2026-118773                  | glob                    | 13.0.7  | >=14.0.2            | Major jump (13→14) through `@opennextjs/cloudflare`.                                       |
| CVE-2026-118764                  | minimatch               | 10.2.5  | >=11.0.1            | Major jump (10→11) through glob → @opennextjs/cloudflare.                                  |

**Recommended actions:**

1. Upgrade `vitest` to `^4.1.12` across all workspaces to resolve 4 advisories including 2 criticals (tinypool). Check [vitest v4 migration guide](https://vitest.dev) before merging.
2. Check whether `@opennextjs/cloudflare` has released an update that bundles glob >=14 and minimatch >=11.
3. Wait for `expo@53+` or an `@expo/cli` update that ships `tar@7.x` and `@xmldom/xmldom@0.8.15+`.
