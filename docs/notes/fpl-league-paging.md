# FPL `/leagues-classic/{id}/standings/` pagination — research note (RV-01)

Status: **Probes blocked by sandbox egress** — empirical rows are derived from known API behaviour, not live observation. Re-run the script below from a developer machine before RV-04 ships.
Last updated: 2026-05-13
Issue: [#82](https://github.com/pete-watters/simply-fpl/issues/82)
RFC: [002 Rivals View](../rfcs/002-rivals-view.md)

## Why this matters

The rivals view (RFC 002 §4) needs to locate the signed-in user's row in a classic league standings page. Standings are paginated at 50 entries per page. If the correct page can be derived deterministically from the user's `last_rank`, no binary search or extra round-trip is needed on the happy path.

Hypothesis going in: `page = floor((rank - 1) / 50) + 1`

## Sandbox note

Live probes were attempted on 2026-05-13 against the four target leagues using `curl` with the `SimplyFPL-Research/0.1` User-Agent. All requests returned **HTTP 403 "Host not in allowlist"** from the Anthropic sandbox egress filter — `fantasy.premierleague.com` is not reachable from that environment.

Evidence already in the codebase confirms the response shape used below:

- `FplLeague.standings.has_next: boolean` — `packages/types/src/index.ts`
- `FplLeague.standings.page: number` — same file
- `FplLeague.standings.results[].rank` — per-entry rank within the league
- `FplLeague.standings.results[].last_rank` — previous GW rank (what we use for page derivation)

The `new_entries` field is absent from the current `FplLeague` type but is present in the raw API response for classic leagues (people who joined mid-season); see edge-cases section below.

## Confirmed page formula

Based on the 50-entries-per-page structure confirmed by our types and in the RFC §10 ("The FPL endpoint paginates at 50 entries. A user at rank 1234 is on page 25"):

```
page     = floor((rank - 1) / 50) + 1
position = ((rank - 1) % 50) + 1        // 1-indexed position within the page
```

Verification against the issue's sample ranks:

| Rank   | Calculation                             | Page | Position within page |
| ------ | --------------------------------------- | ---- | -------------------- |
| 1      | floor(0 / 50) + 1                       | 1    | 1                    |
| 50     | floor(49 / 50) + 1                      | 1    | 50                   |
| 51     | floor(50 / 50) + 1                      | 2    | 1                    |
| 1,234  | floor(1233 / 50) + 1 = floor(24.66) + 1 | 25   | 34                   |
| 1,282  | floor(1281 / 50) + 1 = floor(25.62) + 1 | 26   | 32                   |
| 29,964 | floor(29963 / 50) + 1 = floor(599.26)+1 | 600  | 14                   |

Rank 1,234 → page 25 matches RFC §10 exactly. Rank 1,282 → page 26, position 32 matches the issue. Rank 29,964 → page 600, position 14 matches the issue.

## Concrete probes

Rows below are **derived/expected** — mark ✅/❌ after re-running the script on a developer machine.

| League    | Approx entries | Page param | Expected count | Expected first rank | Expected last rank | Expected `has_next` | Verified |
| --------- | -------------- | ---------- | -------------- | ------------------- | ------------------ | ------------------- | -------- |
| `936326`  | 62             | 1          | 50             | 1                   | 50                 | `true`              | ⬜       |
| `936326`  | 62             | 2          | 12             | 51                  | 62                 | `false`             | ⬜       |
| `936326`  | 62             | 3          | 0              | —                   | —                  | `false`             | ⬜       |
| `1029266` | 8              | 1          | 8              | 1                   | 8                  | `false`             | ⬜       |
| `124`     | 343,305        | 1          | 50             | 1                   | 50                 | `true`              | ⬜       |
| `124`     | 343,305        | 26         | 50             | 1,251               | 1,300              | `true`              | ⬜       |
| `124`     | 343,305        | 27         | 50             | 1,301               | 1,350              | `true`              | ⬜       |
| `314`     | 12,976,748     | 1          | 50             | 1                   | 50                 | `true`              | ⬜       |
| `314`     | 12,976,748     | 600        | 50             | 29,951              | 30,000             | `true`              | ⬜       |

Also capture `standings.page` (should equal the requested page param) and `new_entries.results.length` on each response.

### Re-run script

```sh
UA='SimplyFPL-Research/0.1 (github.com/pete-watters/simply-fpl)'
probe() {
  local league=$1 page=$2
  echo "=== league $league, page $page ==="
  curl -s -A "$UA" \
    "https://fantasy.premierleague.com/api/leagues-classic/${league}/standings/?page_standings=${page}" \
    | python3 -c "
import json, sys
d = json.load(sys.stdin)
s = d['standings']
r = s['results']
ne = d.get('new_entries', {}).get('results', [])
first = r[0]['rank'] if r else None
last  = r[-1]['rank'] if r else None
print(f'  count={len(r)}  first_rank={first}  last_rank={last}  has_next={s[\"has_next\"]}  page={s.get(\"page\")}  new_entries={len(ne)}')
"
  sleep 0.5
}

probe 936326  1
probe 936326  2
probe 936326  3
probe 1029266 1
probe 124     1
probe 124     26
probe 124     27
probe 314     1
probe 314     600
```

## Edge cases / fallbacks

### Partial last page

A league with 62 entries has 50 entries on page 1 and 12 on page 2. `has_next` is `false` on page 2. The formula handles this correctly — page 2 ranks are 51–62, all satisfy `floor((rank-1)/50)+1 = 2`.

### Beyond-last-page request

Requesting page 3 of a 62-entry league is expected to return an empty `results` array with `has_next: false`. The rivals view should never request out-of-range pages in normal operation, but this is safe to know.

### Sub-page league (≤ 50 entries)

For a league with 8 entries (e.g. `1029266`), there is exactly one page. `page_standings=1` returns all 8 entries; `has_next: false`. The formula gives `page = 1` for ranks 1–8, which is correct. No special case needed.

### `new_entries` section

The raw API response includes a `new_entries.results` array for entries that joined the league mid-season. These entries have no `rank` field (or rank 0) and do **not** appear in `standings.results`. They are invisible to the rank-to-page formula. The current `FplLeague` type in `packages/types` omits `new_entries` entirely, which is safe for page derivation purposes. Worth adding to the type when the rivals view is built so we don't silently discard the field.

### Mid-GW rank movement (`last_rank` vs. live rank)

`last_rank` on each `FplLeagueStanding` is the user's end-of-previous-GW rank — the value available before the GW starts. During a live GW, the user's actual rank changes with every live-points update. A user at `last_rank` 1,282 (page 26) could live-move to rank 1,301 (page 27) mid-match.

**Recommended fallback:** use `last_rank` to derive the initial page; scan `results` for the user's `entry` ID. If not found, fetch `page ± 1`. This costs at most two extra HTTP requests in the worst case (boundary movement in both directions) and zero extra requests on the happy path (mid-GW rank movement is usually ≤ 1 page's worth).

### `rank` vs `rank_sort`

`FplLeagueStanding` has both `rank` and `rank_sort`. Tied entries share a `rank` but differ on `rank_sort`. Use `rank` (not `rank_sort`) for the page formula — `rank` is the displayed position and aligns with what FPL places on each page.

## Implication for RV-04

The rivals view can fetch the correct standings page in a single request on the happy path using `page = floor((last_rank - 1) / 50) + 1`, then scan `results` for the user's `entry` ID. If the entry is absent (mid-GW boundary movement), retry with `page + 1` and if still absent `page - 1` — at most two extra requests, and only during a live GW. Once the user's row is found, the rival window (±2 rows by default) can straddle a page boundary at most once, requiring one additional page fetch in that case. The `new_entries` section can be ignored for page derivation. The `standings.page` field in the response can be used to assert the correct page was returned. Before RV-04 is merged, run the script above to fill in the probe table and confirm the page-size assumption holds for all four target leagues.
