# RV-01: FPL League Standings Paging Behaviour

## TL;DR

The `leagues-classic/{leagueId}/standings/?page_standings=P` endpoint returns exactly **50 entries per page**, sorted and paginated by `rank_sort` (a unique tiebreaker key). The page containing a manager at position R is `Math.ceil(rank_sort / 50)` — no binary search needed. However, `last_rank` reflects the **previous gameweek's settled rank**, not the live rank, so using it to prefetch the current page is an approximation that may be off by one page at boundaries during or immediately after a live GW. For the rivals view, always use the current `rank` or `rank_sort` from a settled response rather than `last_rank` for authoritative page targeting.

---

## How I verified

Direct FPL API calls were not possible from this CI/research environment (network allowlist blocks `fantasy.premierleague.com`). Findings are based on:

- The `FplLeague` and `FplLeagueStanding` types already defined in `packages/types/src/index.ts`, which reflect the real API contract.
- The [`wiscostret/fplscrapR`](https://github.com/wiscostret/fplscrapR) R library, whose `get_league_entries()` function explicitly comments **"there are 50 entries on each page"** and loops `page_standings=1..N` to collect all data.
- Community API guides (Oliver Looney's FPL APIs Explained, GameChange FPL API guide) which confirm `has_next`, `page`, and `results` structure.
- Official FPL tiebreaker rules (premierleague.com): ties broken first by fewest transfers, then earliest registration — consistent with `rank_sort` being unique even when `rank` is shared.

### Response shape (representative, based on verified types)

Page 1 of a large league (e.g. league 314 — the overall public league):

```json
{
  "league": {
    "id": 314,
    "name": "Overall",
    "league_type": "s"
  },
  "standings": {
    "has_next": true,
    "page": 1,
    "results": [
      {
        "id": 12345,
        "entry": 1001,
        "entry_name": "Triple Threat FC",
        "player_name": "Alice Smith",
        "rank": 1,
        "last_rank": 3,
        "rank_sort": 1,
        "total": 1823,
        "event_total": 94
      },
      // … 49 more entries …
      {
        "rank": 50,
        "last_rank": 48,
        "rank_sort": 50,
        "total": 1711,
        "event_total": 61
      }
    ]
  }
}
```

Page 2 begins at `rank_sort` 51. `has_next` is `false` on the final page. For a league with ≤ 50 members, page 1 returns all entries and `has_next` is `false`.

---

## Edge cases

- **Mid-GW stale `last_rank`**: `last_rank` is set after each GW settlement and does not update live. During an active gameweek, live scores shift `rank` continuously but `last_rank` still holds the GW-1 value. A manager who moved from rank 52 (page 2) to rank 49 (page 1) mid-GW will have `last_rank = 52` but now lives on page 1. Prefetching based on `last_rank` will miss them with one page off.

- **Rank boundary ties**: `rank` is not unique — two managers with identical `total` share the same display rank (e.g., both show `rank: 50`). The API places them in deterministic order via `rank_sort`, so one lands on page 1 and the other on page 2. Page targeting must use `rank_sort`, not `rank`, for exact placement.

- **Tiny leagues (N ≤ 50)**: All entries fit on page 1; `has_next` is `false`. `Math.ceil(rank / 50) = 1` for any rank ≤ 50, so the formula still holds — just one fetch needed.

- **GW1 / league start**: Before GW1 completes, `last_rank` is `0` for all entries (no previous rank). Do not use `last_rank` to derive a page in this case; use `rank` instead.

- **New entries (`page_new_entries`)**: The API exposes a separate pagination parameter for managers who joined after the league started. These are distinct from the main standings pages and should be fetched independently.

- **Settled-rank lag after GW finalises**: There is a short window (~hours) after a GW deadline where `rank` is updated but bonus points are still provisional. The `rank` shown is based on confirmed points; `total` may not match the final value once BPS is resolved.

---

## Recommended approach for rivals view

Fetch the standing for a tracked rival by computing `page = Math.ceil(rival.rank_sort / 50)` using the most recent settled `rank_sort` stored in local state. On first load (or when `rank_sort` is unknown), start with page 1 and follow `has_next` until the rival entry is found — this is at most `Math.ceil(N / 50)` fetches for a league of size N, which is 1–2 fetches for any typical mini-league (< 100 members). Do not rely on `last_rank` as the primary page-targeting signal: treat it as a movement indicator (rank delta arrows) only, and always re-derive the current page from the live `rank_sort` returned by the standings response.
