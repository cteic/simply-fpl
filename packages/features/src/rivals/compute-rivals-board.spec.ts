import { describe, expect, it } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLeagueStanding,
  FplLiveGameweek,
} from '@simplyfpl/types';

import { computeRivalsBoard } from './compute-rivals-board';

const BOOTSTRAP: FplBootstrapStatic = {
  elements: [],
  teams: [],
  events: [],
  element_types: [],
};

const NO_STANDINGS: FplLeagueStanding[] = [];

function makePick(
  element: number,
  position: number,
  opts: { captain?: boolean; vc?: boolean; multiplier?: number } = {}
): FplEntryPick {
  let defaultMul = position <= 11 ? 1 : 0;
  if (opts.captain) defaultMul = 2;
  return {
    element,
    position,
    multiplier: opts.multiplier ?? defaultMul,
    is_captain: opts.captain ?? false,
    is_vice_captain: opts.vc ?? false,
  };
}

function makePicks(
  chip: string | null,
  transferCost: number,
  picks: FplEntryPick[]
): FplEntryGameweekPicks {
  return {
    active_chip: chip,
    automatic_subs: [],
    entry_history: {
      event: 1,
      points: 0,
      total_points: 0,
      rank: 1,
      rank_sort: 1,
      overall_rank: 1,
      event_transfers: 0,
      event_transfers_cost: transferCost,
      points_on_bench: 0,
    },
    picks,
  };
}

function makeLive(pts: Record<number, number>): FplLiveGameweek {
  return {
    elements: Object.entries(pts).map(([id, total_points]) => ({
      id: Number(id),
      stats: {
        minutes: 90,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        goals_conceded: 0,
        yellow_cards: 0,
        red_cards: 0,
        saves: 0,
        bonus: 0,
        bps: 0,
        total_points,
      },
      explain: [],
    })),
  };
}

function makeRival(
  entryId: number,
  picks: FplEntryGameweekPicks
): { entryId: number; entryName: string; playerName: string; picks: FplEntryGameweekPicks } {
  return { entryId, entryName: `Team ${entryId}`, playerName: `Player ${entryId}`, picks };
}

describe('computeRivalsBoard', () => {
  it('counts bench players on bench boost and reports zero bench points wasted', () => {
    const liveData = makeLive({
      1: 5,
      2: 3,
      3: 3,
      4: 3,
      5: 3,
      6: 3,
      7: 3,
      8: 3,
      9: 3,
      10: 3,
      11: 3,
      12: 4,
      13: 4,
      14: 4,
      15: 4,
    });
    // BB: bench picks get multiplier 1 — they count in livePoints and are not wasted
    const picks = makePicks('bboost', 0, [
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
      makePick(12, 12, { multiplier: 1 }),
      makePick(13, 13, { multiplier: 1 }),
      makePick(14, 14, { multiplier: 1 }),
      makePick(15, 15, { multiplier: 1 }),
    ]);
    // captain 5×2=10, starters 2-11 10×3=30, bench 4×4=16 → 56
    const result = computeRivalsBoard(0, NO_STANDINGS, [makeRival(1, picks)], liveData, BOOTSTRAP);
    const [row] = result;
    expect(row?.livePoints).toBe(56);
    expect(row?.benchPointsWasted).toBe(0);
    expect(row?.activeChip).toBe('bboost');
  });

  it('applies triple captain 3× multiplier', () => {
    const liveData = makeLive({
      1: 10,
      2: 3,
      3: 3,
      4: 3,
      5: 3,
      6: 3,
      7: 3,
      8: 3,
      9: 3,
      10: 3,
      11: 3,
    });
    const picks = makePicks('3xc', 0, [
      makePick(1, 1, { captain: true, multiplier: 3 }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
    ]);
    // captain 10×3=30, others 10×3=30 → 60
    const result = computeRivalsBoard(0, NO_STANDINGS, [makeRival(1, picks)], liveData, BOOTSTRAP);
    const [row] = result;
    expect(row?.livePoints).toBe(60);
    expect(row?.captainMultiplier).toBe(3);
    expect(row?.activeChip).toBe('3xc');
  });

  it('deducts transfer hit cost from live points', () => {
    const liveData = makeLive({
      1: 5,
      2: 3,
      3: 3,
      4: 3,
      5: 3,
      6: 3,
      7: 3,
      8: 3,
      9: 3,
      10: 3,
      11: 3,
    });
    const picks = makePicks(null, 4, [
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
    ]);
    // captain 5×2=10, others 10×3=30 → 40 − 4 = 36
    const result = computeRivalsBoard(0, NO_STANDINGS, [makeRival(1, picks)], liveData, BOOTSTRAP);
    const [row] = result;
    expect(row?.livePoints).toBe(36);
    expect(row?.transferHits).toBe(4);
  });

  it('handles blank gameweek player with zero points and accumulates bench points wasted', () => {
    const liveData = makeLive({
      1: 0,
      2: 5,
      3: 5,
      4: 5,
      5: 5,
      6: 5,
      7: 5,
      8: 5,
      9: 5,
      10: 5,
      11: 5,
      12: 3,
      13: 3,
      14: 3,
      15: 3,
    });
    // Captain blanks; bench players have multiplier 0 (not auto-subbed in, not BB)
    const picks = makePicks(null, 0, [
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
      makePick(12, 12),
      makePick(13, 13),
      makePick(14, 14),
      makePick(15, 15),
    ]);
    // captain 0×2=0, starters 10×5=50 → 50; bench wasted 4×3=12
    const result = computeRivalsBoard(0, NO_STANDINGS, [makeRival(1, picks)], liveData, BOOTSTRAP);
    const [row] = result;
    expect(row?.livePoints).toBe(50);
    expect(row?.captainElement).toBe(1);
    expect(row?.benchPointsWasted).toBe(12);
  });

  it('records free hit chip without altering captain or bench scoring', () => {
    const liveData = makeLive({
      1: 5,
      2: 3,
      3: 3,
      4: 3,
      5: 3,
      6: 3,
      7: 3,
      8: 3,
      9: 3,
      10: 3,
      11: 3,
      12: 4,
      13: 4,
      14: 4,
      15: 4,
    });
    const picks = makePicks('freehit', 0, [
      makePick(1, 1, { captain: true }),
      ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((e) => makePick(e, e)),
      makePick(12, 12),
      makePick(13, 13),
      makePick(14, 14),
      makePick(15, 15),
    ]);
    const result = computeRivalsBoard(0, NO_STANDINGS, [makeRival(1, picks)], liveData, BOOTSTRAP);
    const [row] = result;
    expect(row?.livePoints).toBe(40);
    expect(row?.activeChip).toBe('freehit');
    expect(row?.captainMultiplier).toBe(2);
    expect(row?.benchPointsWasted).toBe(16);
  });

  it('sorts four rivals descending with stable ordering for tied scores', () => {
    // Each rival has a unique scorer element; captain scores 0 so 2× doesn't interfere
    // Alpha=60, Beta=45, Gamma=45 (tied with Beta — Beta must stay before Gamma), Delta=30
    const liveData = makeLive({ 102: 60, 202: 45, 302: 45, 402: 30 });

    const alpha = makeRival(
      1,
      makePicks(null, 0, [makePick(101, 1, { captain: true }), makePick(102, 2)])
    );
    const beta = makeRival(
      2,
      makePicks(null, 0, [makePick(201, 1, { captain: true }), makePick(202, 2)])
    );
    const gamma = makeRival(
      3,
      makePicks(null, 0, [makePick(301, 1, { captain: true }), makePick(302, 2)])
    );
    const delta = makeRival(
      4,
      makePicks(null, 0, [makePick(401, 1, { captain: true }), makePick(402, 2)])
    );

    const result = computeRivalsBoard(
      0,
      NO_STANDINGS,
      [alpha, beta, gamma, delta],
      liveData,
      BOOTSTRAP
    );

    expect(result.map((r) => r.entryId)).toEqual([1, 2, 3, 4]);
    expect(result.map((r) => r.livePoints)).toEqual([60, 45, 45, 30]);
  });
});
