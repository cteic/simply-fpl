import { describe, expect, it } from 'vitest';

import type {
  FplEntry,
  FplEntryGameweekPicks,
  FplEntryPick,
  FplLiveElement,
} from '@simplyfpl/types';

import type { LiveRankEstimateInput } from './use-live-rank-estimate';
import { computeLiveRankEstimate } from './use-live-rank-estimate';

function liveEl(id: number, totalPoints: number): FplLiveElement {
  return {
    id,
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
      total_points: totalPoints,
      clearances_blocks_interceptions: 0,
      tackles: 0,
    },
    explain: [],
  };
}

function pick(element: number, position: number, isCaptain = false): FplEntryPick {
  let multiplier = 1;
  if (position > 11) multiplier = 0;
  else if (isCaptain) multiplier = 2;
  return {
    element,
    position,
    multiplier,
    is_captain: isCaptain,
    is_vice_captain: false,
  };
}

function buildInput(): LiveRankEstimateInput {
  const picks: FplEntryGameweekPicks = {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 7,
      points: 0,
      total_points: 0,
      rank: 0,
      rank_sort: 0,
      overall_rank: 0,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: [
      pick(1, 1, true),
      pick(2, 2),
      pick(3, 3),
      pick(4, 4),
      pick(5, 5),
      pick(6, 6),
      pick(7, 7),
      pick(8, 8),
      pick(9, 9),
      pick(10, 10),
      pick(11, 11),
      pick(12, 12),
      pick(13, 13),
      pick(14, 14),
      pick(15, 15),
    ],
  };

  const entry: FplEntry = {
    id: 42,
    player_first_name: 'Test',
    player_last_name: 'Manager',
    name: 'Test FC',
    summary_overall_rank: 1_000_000,
    summary_overall_points: 0,
    summary_event_rank: null,
    summary_event_points: 0,
  };

  return {
    entry,
    picks,
    bootstrap: {
      elements: [],
      teams: [],
      events: [
        {
          id: 7,
          name: 'Gameweek 7',
          deadline_time: '2026-01-01T00:00:00Z',
          is_current: true,
          is_next: false,
          is_previous: false,
          average_entry_score: 50,
          highest_score: null,
          finished: false,
        },
      ],
      element_types: [],
    },
    liveGw: {
      elements: Array.from({ length: 15 }, (_, i) => liveEl(i + 1, 5)),
    },
    fixtures: [],
    gw: 7,
  };
}

function withGw(input: LiveRankEstimateInput, gw: number): LiveRankEstimateInput {
  const event = input.bootstrap.events[0];
  if (!event) return input;
  return {
    ...input,
    gw,
    bootstrap: {
      ...input.bootstrap,
      events: [{ ...event, id: gw }],
    },
    picks: { ...input.picks, entry_history: { ...input.picks.entry_history, event: gw } },
  };
}

describe('computeLiveRankEstimate', () => {
  it('falls back to flat-700 when no captured distribution exists for the gw', () => {
    // 10 starters @ 5 + captain 5*2 = 60 net points; average 50 -> +10 -> +7000 places.
    const estimate = computeLiveRankEstimate(withGw(buildInput(), 999));
    expect(estimate).toEqual({
      liveRank: 993_000,
      movement: 7000,
      direction: 'up',
      source: 'flat-heuristic',
    });
  });

  it('ignores a captured distribution unless the caller opts in', () => {
    // gw=7 has a captured `overall` distribution, but it measured 12x worse
    // than the flat model, so it no longer runs by default.
    const estimate = computeLiveRankEstimate(buildInput());
    expect(estimate?.source).toBe('flat-heuristic');
    expect(estimate?.liveRank).toBe(993_000);
  });

  it('uses the captured distribution when the caller opts in', () => {
    const estimate = computeLiveRankEstimate({
      ...buildInput(),
      useDistributionModel: true,
    });
    expect(estimate).not.toBeNull();
    if (estimate) {
      expect(estimate.liveRank).not.toBe(993_000);
      expect(estimate.liveRank).toBeGreaterThanOrEqual(1);
      expect(estimate.liveRank).toBeLessThanOrEqual(11_000_000);
    }
  });

  it("reads live rank off FPL's own curve when one is supplied", () => {
    const base = buildInput();
    // preGwTotal is derived from the picks payload, not passed in: a manager on
    // 606 total who has banked 25 of it this gameweek went in on 581.
    const input: LiveRankEstimateInput = {
      ...base,
      picks: {
        ...base.picks,
        entry_history: { ...base.picks.entry_history, points: 25, total_points: 606 },
      },
    };
    const preGwTotal = input.picks.entry_history.total_points - input.picks.entry_history.points;
    expect(preGwTotal).toBe(581);
    const estimate = computeLiveRankEstimate({
      ...input,
      curve: {
        gw: 7,
        rankedCount: 11_261_396,
        builtAt: '2026-11-26T00:00:00Z',
        points: [
          { totalPoints: 855, rank: 1 },
          { totalPoints: 748, rank: 49_929 },
          { totalPoints: 700, rank: 548_847 },
          { totalPoints: 605, rank: 4_399_904 },
          { totalPoints: 541, rank: 7_498_198 },
          { totalPoints: 153, rank: 11_099_560 },
        ],
      },
    });
    expect(estimate?.source).toBe('official-curve');
    expect(estimate?.liveRank).toBeGreaterThanOrEqual(1);
    expect(estimate?.liveRank).toBeLessThanOrEqual(11_261_396);
    // 581 + 60 - 50 = 591 lands between the 605 and 541 samples, so the
    // estimate must sit between their ranks rather than clamping to an end.
    expect(estimate?.liveRank).toBeGreaterThan(4_399_904);
    expect(estimate?.liveRank).toBeLessThan(7_498_198);
  });

  it('returns identical values for the nav-bar pill and the live-rank page (no desync)', () => {
    const snapshot = buildInput();
    const headerValue = computeLiveRankEstimate(snapshot);
    const pageValue = computeLiveRankEstimate(snapshot);
    expect(headerValue).not.toBeNull();
    expect(headerValue).toEqual(pageValue);
  });

  it('passes bootstrap through so a prior-season distribution gets mean-shifted', () => {
    const input = buildInput();
    const current = input.bootstrap.events[0];
    if (!current) throw new Error('fixture must have an event');
    input.bootstrap = {
      ...input.bootstrap,
      events: [
        {
          ...current,
          id: 1,
          name: 'Gameweek 1',
          deadline_time: '2026-08-14T17:30:00Z',
          is_current: false,
        },
        current,
      ],
    };
    const estimate = computeLiveRankEstimate({ ...input, useDistributionModel: true });
    expect(estimate?.source).toBe('captured-prior-season-scaled');
  });

  it('uses the gameweek ranked_count as the rank denominator when FPL reports one', () => {
    const base = buildInput();
    const event = base.bootstrap.events[0];
    if (!event) throw new Error('fixture must have an event');
    const withCount = computeLiveRankEstimate({
      ...base,
      useDistributionModel: true,
      bootstrap: {
        ...base.bootstrap,
        events: [{ ...event, ranked_count: 5_500_000 }],
      },
    });
    const withoutCount = computeLiveRankEstimate({ ...base, useDistributionModel: true });
    expect(withCount).not.toBeNull();
    expect(withoutCount).not.toBeNull();
    if (withCount && withoutCount) {
      expect(withCount.liveRank).toBeLessThan(withoutCount.liveRank);
    }
  });

  it('returns null when the pre-GW rank is unknown', () => {
    const input = buildInput();
    input.entry.summary_overall_rank = 0;
    expect(computeLiveRankEstimate(input)).toBeNull();
  });

  it('returns null once the current gameweek has finished', () => {
    // An event keeps is_current until the next deadline. Once it finishes, FPL
    // has folded its points into summary_overall_rank, so estimating again
    // counts the same points twice and swings the figure by millions.
    const input = buildInput();
    const event = input.bootstrap.events[0];
    if (!event) throw new Error('fixture must have an event');
    input.bootstrap = {
      ...input.bootstrap,
      events: [{ ...event, is_current: true, finished: true }],
    };
    expect(computeLiveRankEstimate(input)).toBeNull();
  });

  it('still estimates while the current gameweek is unfinished', () => {
    const input = buildInput();
    const event = input.bootstrap.events[0];
    if (!event) throw new Error('fixture must have an event');
    input.bootstrap = {
      ...input.bootstrap,
      events: [{ ...event, is_current: true, finished: false }],
    };
    expect(computeLiveRankEstimate(input)).not.toBeNull();
  });
});
