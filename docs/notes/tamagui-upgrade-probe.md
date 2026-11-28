# Tamagui Upgrade Probe

**Run date:** 2026-11-28 (UTC)

## Version summary

|                                             | Version |
| ------------------------------------------- | ------- |
| Current pinned (`packages/ui/package.json`) | `2.4.0` |
| Latest (`npm view tamagui version`)         | `3.3.3` |

**Gap:** Major version bump — `2.x → 3.x`

## Pre-release channels of note

| Tag      | Version                        |
| -------- | ------------------------------ |
| `latest` | `3.3.3`                        |
| `beta`   | `3.0.0-beta.1670.1`            |
| `canary` | `3.0.0-0.canary.1794877259099` |
| `prepub` | `1.123.3`                      |

The `beta` and `canary` channels are behind `latest`, indicating the 3.x line has stabilised.

## Why this matters

The SSR work was parked because Tamagui's compiler/extractor had issues with Next.js App Router SSR at the time of the feasibility spike. A major version bump (`2.x → 3.x`) is exactly the kind of release that could include compiler/SSR fixes.

See [`docs/notes/tamagui-ssr.md`](./tamagui-ssr.md) for the original SSR context from PR #115.

## Suggested next step

Schedule a dedicated upgrade session to evaluate whether Tamagui 3.x resolves the App Router SSR blockers identified in `docs/notes/tamagui-ssr.md`.

**Do NOT auto-bump Tamagui from this routine.** A major version upgrade requires manual testing against the App Router setup, review of the Tamagui 3.x changelog/migration guide, and validation that the design token system in `packages/ui` is unaffected.
