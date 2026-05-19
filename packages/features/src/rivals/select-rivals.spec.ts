import { describe, expect, it } from 'vitest';

import type { FplLeagueStanding } from '@simplyfpl/types';

import { SMALL_LEAGUE_THRESHOLD, selectRivalEntryIds } from './select-rivals';

function makeStanding(entry: number, rank: number): FplLeagueStanding {
  return {
    id: entry,
    entry,
    entry_name: `Team ${entry}`,
    player_name: `Player ${entry}`,
    rank,
    last_rank: rank,
    rank_sort: rank,
    total: 1000 - rank,
    event_total: 60 - rank,
  };
}

describe('selectRivalEntryIds', () => {
  it('returns the whole league minus the user when the league has <= 8 entries', () => {
    const standings = [1, 2, 3, 4, 5, 6, 7, 8].map((id, i) => makeStanding(id, i + 1));
    const { rivalEntryIds, isWholeLeague, userStanding } = selectRivalEntryIds(standings, 3);
    expect(isWholeLeague).toBe(true);
    expect(rivalEntryIds).toEqual([1, 2, 4, 5, 6, 7, 8]);
    expect(userStanding?.entry).toBe(3);
  });

  it('returns 2 above + 2 below by default when league exceeds the small threshold', () => {
    const standings = Array.from({ length: 20 }, (_, i) => makeStanding(100 + i, i + 1));
    const { rivalEntryIds, isWholeLeague, userStanding } = selectRivalEntryIds(standings, 109);
    expect(isWholeLeague).toBe(false);
    expect(rivalEntryIds).toEqual([107, 108, 110, 111]);
    expect(userStanding?.rank).toBe(10);
  });

  it('clips the window at the top of the standings', () => {
    const standings = Array.from({ length: 20 }, (_, i) => makeStanding(100 + i, i + 1));
    const { rivalEntryIds } = selectRivalEntryIds(standings, 100);
    expect(rivalEntryIds).toEqual([101, 102]);
  });

  it('clips the window at the bottom of the standings', () => {
    const standings = Array.from({ length: 20 }, (_, i) => makeStanding(100 + i, i + 1));
    const { rivalEntryIds } = selectRivalEntryIds(standings, 119);
    expect(rivalEntryIds).toEqual([117, 118]);
  });

  it('returns an empty result when standings is empty', () => {
    const { rivalEntryIds, userStanding, isWholeLeague } = selectRivalEntryIds([], 1);
    expect(rivalEntryIds).toEqual([]);
    expect(userStanding).toBeNull();
    expect(isWholeLeague).toBe(false);
  });

  it('returns an empty list when the user is not in the league', () => {
    const standings = Array.from({ length: 20 }, (_, i) => makeStanding(100 + i, i + 1));
    const { rivalEntryIds, userStanding } = selectRivalEntryIds(standings, 999);
    expect(rivalEntryIds).toEqual([]);
    expect(userStanding).toBeNull();
  });

  it('honours a custom window size', () => {
    const standings = Array.from({ length: 20 }, (_, i) => makeStanding(100 + i, i + 1));
    const { rivalEntryIds } = selectRivalEntryIds(standings, 109, { above: 1, below: 3 });
    expect(rivalEntryIds).toEqual([108, 110, 111, 112]);
  });

  it('SMALL_LEAGUE_THRESHOLD is 8', () => {
    expect(SMALL_LEAGUE_THRESHOLD).toBe(8);
  });
});
