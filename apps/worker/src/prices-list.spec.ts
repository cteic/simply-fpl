import { describe, expect, it } from 'vitest';

import type { FplBootstrapStatic, FplPlayer } from '@simplyfpl/types';

import { PRICES_LIST_FLOOR_PERCENT, PRICES_LIST_MAX_ROWS, buildSlimPrices } from './prices';

function player(id: number, progress: number): FplPlayer {
  return {
    id,
    web_name: `P${id}`,
    first_name: '',
    second_name: '',
    team: 1,
    element_type: 3,
    now_cost: 60,
    total_points: 0,
    event_points: 0,
    selected_by_percent: '10.0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: null,
    news: '',
    price_change_percent: progress.toFixed(1),
    price_change_hourly_rate: 100,
    price_change_projections: [
      { offset: 0, projected_percent: progress.toFixed(1), likelihood: 3 },
    ],
    price_change_locked_until: null,
    price_change_calibrating: false,
  };
}

function bootstrap(players: FplPlayer[]): FplBootstrapStatic {
  return {
    elements: players,
    teams: [{ id: 1, name: 'Arsenal', short_name: 'ARS', code: 3 }],
    events: [],
    element_types: [],
  };
}

describe('buildSlimPrices list size', () => {
  it('leaves out players who are not yet halfway to a change', () => {
    const slim = buildSlimPrices(
      bootstrap([player(1, 12), player(2, 49.9), player(3, 50), player(4, 97)])
    );
    expect(slim.changes.map((c) => c.id)).toEqual([4, 3]);
    for (const change of slim.changes) {
      expect(change.progress_percent).toBeGreaterThanOrEqual(PRICES_LIST_FLOOR_PERCENT);
    }
  });

  it('counts a faller by how far along it is, not by its sign', () => {
    const slim = buildSlimPrices(bootstrap([player(1, -80), player(2, -20)]));
    expect(slim.changes.map((c) => c.id)).toEqual([1]);
    expect(slim.changes[0]?.direction).toBe('fall');
  });

  it('caps a busy night and keeps the players closest to changing', () => {
    // Listing everyone moving at all once produced 474 rows and a 150 KB payload
    // that both apps rendered in full, which made the mobile app drop taps.
    const many = Array.from({ length: 300 }, (_unused, i) => player(i + 1, 50 + i * 0.1));
    const slim = buildSlimPrices(bootstrap(many));
    expect(slim.changes).toHaveLength(PRICES_LIST_MAX_ROWS);
    expect(slim.changes[0]?.id).toBe(300);
    const kept = slim.changes.map((c) => c.progress_percent);
    expect(Math.min(...kept)).toBeGreaterThan(50 + (300 - PRICES_LIST_MAX_ROWS - 1) * 0.1);
  });
});
