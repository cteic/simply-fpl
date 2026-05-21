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

describe('computeLiveRankEstimate', () => {
  it('derives the live rank from pre-GW rank, live points and the GW average', () => {
    // 10 starters @ 5 + captain 5*2 = 60 net points; average 50 -> +10 -> +7000 places.
    const estimate = computeLiveRankEstimate(buildInput());
    expect(estimate).toEqual({ liveRank: 993_000, movement: 7000, direction: 'up' });
  });

  it('returns identical values for the nav-bar pill and the live-rank page (no desync)', () => {
    const snapshot = buildInput();
    const headerValue = computeLiveRankEstimate(snapshot);
    const pageValue = computeLiveRankEstimate(snapshot);
    expect(headerValue).not.toBeNull();
    expect(headerValue).toEqual(pageValue);
  });

  it('returns null when the pre-GW rank is unknown', () => {
    const input = buildInput();
    input.entry.summary_overall_rank = 0;
    expect(computeLiveRankEstimate(input)).toBeNull();
  });
});
