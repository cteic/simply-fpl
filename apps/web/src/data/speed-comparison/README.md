# Speed comparison fallback data

`fallback.json` is the hand-curated fallback shown on `/vs-livefpl` when the
automated weekly snapshot from R2 is missing or stale (e.g. Browser Rendering
is unavailable or the cron has not run yet).

## When to update

Update this file **at least once per quarter** (before each new FPL season
starts is a natural cadence). If the numbers become materially misleading
(either site has measurably improved or worsened), update sooner.

## How to update

1. Open `fallback.json`.
2. Replace `measuredAt` with today's date in ISO 8601 format (e.g.
   `2026-09-01T00:00:00.000Z`).
3. Replace `week` with the current ISO week key (e.g. `2026-W36`).
4. Update `timeToFirstData`, `totalBytes`, and `thirdPartyCount` for each site.
   You can get the values from:
   - The `/vs/debug-measure` worker endpoint (requires `VS_DEBUG_TOKEN` header
     in production, or runs without auth in non-prod environments), or
   - A manual Lighthouse / WebPageTest run against both sites.
5. Leave `screenshotKey` as an empty string — screenshots are only served from
   R2 and are not part of the fallback.
6. Commit and deploy. The page uses the fallback automatically whenever
   `GET /vs/data` returns a non-200 response.

## Format

The structure must match the `ComparisonSnapshot` type in
`packages/types/src/index.ts`. The TypeScript import in `apps/web/src/queries/vs.ts`
will fail at build time if the shape is wrong.

## Stale fallback policy

The page displays a note when it is rendering fallback data, so visitors know
the numbers are not the most recent automated measurement. Pete reviews the
fallback age as part of the pre-season checklist.
