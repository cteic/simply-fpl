import { describe, expect, it } from 'vitest';

import type { FplEntryGameweekPicks, FplEntryPick, FplLiveGameweek } from '@simplyfpl/types';

import { aggregateCohort } from './aggregate';

function makePicks(
  picks: FplEntryPick[],
  active_chip: string | null = null,
  gwPoints = 50
): FplEntryGameweekPicks {
  return {
    active_chip,
    automatic_subs: [],
    entry_history: {
      event: 36,
      points: gwPoints,
      total_points: 1800,
      rank: 10000,
      rank_sort: 10000,
      overall_rank: 10000,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 5,
    },
    picks,
  };
}

function makeLiveGw(
  elements: Array<{ id: number; points: number; minutes?: number }>
): FplLiveGameweek {
  return {
    elements: elements.map(({ id, points, minutes = 90 }) => ({
      id,
      stats: {
        minutes,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 0,
        total_points: points,
      },
      explain: [],
    })),
  };
}

describe('aggregateCohort', () => {
  it('returns zero averages and empty ownership maps for an empty cohort', () => {
    const result = aggregateCohort('top10k', 36, [], makeLiveGw([]));
    expect(result.sampleSize).toBe(0);
    expect(result.averageScore).toBe(0);
    expect(result.averagePlayersPlayed).toBe(0);
    expect(result.averageBudgetUsed).toBe(0);
    expect(result.averageCaptainPoints).toBe(0);
    expect(result.playerOwnership).toEqual({});
    expect(result.captainOwnership).toEqual({});
    expect(result.topThreshold).toBe(0);
  });

  it('computes 100% ownership for all players in a single entry', () => {
    const picks: FplEntryPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 2, is_captain: true, is_vice_captain: false },
    ];
    const result = aggregateCohort(
      'top10k',
      36,
      [{ entryId: 1, picks: makePicks(picks) }],
      makeLiveGw([
        { id: 1, points: 5 },
        { id: 2, points: 10 },
      ])
    );
    expect(result.sampleSize).toBe(1);
    expect(result.playerOwnership[1]).toBe(100);
    expect(result.playerOwnership[2]).toBe(100);
    expect(result.captainOwnership[2]).toBe(100);
    expect(result.captainOwnership[1]).toBeUndefined();
  });

  it('computes 50% ownership for differentials and 100% for shared picks across two entries', () => {
    const shared: FplEntryPick = {
      element: 10,
      position: 1,
      multiplier: 1,
      is_captain: false,
      is_vice_captain: false,
    };
    const diff1: FplEntryPick = {
      element: 11,
      position: 2,
      multiplier: 2,
      is_captain: true,
      is_vice_captain: false,
    };
    const diff2: FplEntryPick = {
      element: 12,
      position: 2,
      multiplier: 2,
      is_captain: true,
      is_vice_captain: false,
    };

    const result = aggregateCohort(
      'top10k',
      36,
      [
        { entryId: 1, picks: makePicks([shared, diff1]) },
        { entryId: 2, picks: makePicks([shared, diff2]) },
      ],
      makeLiveGw([
        { id: 10, points: 6 },
        { id: 11, points: 12 },
        { id: 12, points: 8 },
      ])
    );

    expect(result.playerOwnership[10]).toBe(100);
    expect(result.playerOwnership[11]).toBe(50);
    expect(result.playerOwnership[12]).toBe(50);
  });

  it('applies 2x captain multiplier to averageCaptainPoints and averageScore', () => {
    const picks: FplEntryPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 2, is_captain: true, is_vice_captain: false },
    ];
    const result = aggregateCohort(
      'top10k',
      36,
      [{ entryId: 1, picks: makePicks(picks) }],
      makeLiveGw([
        { id: 1, points: 5 },
        { id: 2, points: 7 },
      ])
    );
    expect(result.averageCaptainPoints).toBe(14);
    expect(result.averageScore).toBe(19);
  });

  it('applies 3x triple captain multiplier when TC chip active', () => {
    const picks: FplEntryPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 3, is_captain: true, is_vice_captain: false },
    ];
    const result = aggregateCohort(
      'top10k',
      36,
      [{ entryId: 1, picks: makePicks(picks, 'tripleCapitan') }],
      makeLiveGw([
        { id: 1, points: 5 },
        { id: 2, points: 7 },
      ])
    );
    expect(result.averageCaptainPoints).toBe(21);
    expect(result.averageScore).toBe(26);
  });

  it('scores bench players with multiplier > 0 (bench boost) and excludes multiplier-0 bench', () => {
    const picks: FplEntryPick[] = [
      { element: 1, position: 1, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 2, position: 2, multiplier: 2, is_captain: true, is_vice_captain: false },
      { element: 3, position: 12, multiplier: 1, is_captain: false, is_vice_captain: false },
      { element: 4, position: 13, multiplier: 0, is_captain: false, is_vice_captain: false },
    ];
    const result = aggregateCohort(
      'top10k',
      36,
      [{ entryId: 1, picks: makePicks(picks, 'bboost') }],
      makeLiveGw([
        { id: 1, points: 5 },
        { id: 2, points: 7 },
        { id: 3, points: 8 },
        { id: 4, points: 10 },
      ])
    );
    expect(result.averageScore).toBe(27);
    expect(result.playerOwnership[4]).toBe(100);
  });
});
