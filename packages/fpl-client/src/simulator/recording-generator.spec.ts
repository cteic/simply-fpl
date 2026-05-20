import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplBootstrapStatic, FplEntryGameweekPicks, FplEntryPick } from '@simplyfpl/types';

import { buildExpectedCurve } from './expected-curve';
import type { SquadPlayer } from './manager-pool';
import { DEF_TYPE, FWD_TYPE, GK_TYPE, MID_TYPE, buildManagerPool } from './manager-pool';
import type { RecordingRow } from './recording';
import { normaliseRecordingRows, parseRecording } from './recording';

const feature = await loadFeature('./recording-generator.feature');

const EMPTY_BOOTSTRAP: FplBootstrapStatic = {
  elements: [],
  teams: [],
  events: [],
  element_types: [],
};

const SQUAD: SquadPlayer[] = [
  { id: 1, elementType: GK_TYPE, strength: 168 },
  { id: 8, elementType: GK_TYPE, strength: 158 },
  { id: 2, elementType: DEF_TYPE, strength: 162 },
  { id: 3, elementType: DEF_TYPE, strength: 154 },
  { id: 7, elementType: DEF_TYPE, strength: 178 },
  { id: 14, elementType: DEF_TYPE, strength: 132 },
  { id: 15, elementType: DEF_TYPE, strength: 148 },
  { id: 4, elementType: MID_TYPE, strength: 212 },
  { id: 5, elementType: MID_TYPE, strength: 152 },
  { id: 6, elementType: MID_TYPE, strength: 320 },
  { id: 10, elementType: MID_TYPE, strength: 184 },
  { id: 11, elementType: MID_TYPE, strength: 244 },
  { id: 9, elementType: FWD_TYPE, strength: 296 },
  { id: 12, elementType: FWD_TYPE, strength: 188 },
  { id: 13, elementType: FWD_TYPE, strength: 180 },
];

function typeOf(id: number): number {
  const player = SQUAD.find((p) => p.id === id);
  return player ? player.elementType : 0;
}

function makeFrame(ts: string, points: Record<number, number>): RecordingRow {
  return {
    ts,
    gw: 37,
    data: {
      elements: SQUAD.map((player) => ({
        id: player.id,
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
          total_points: points[player.id] ?? 0,
        },
        explain: [],
      })),
    },
  };
}

function makePick(element: number, position: number, isCaptain = false): FplEntryPick {
  return {
    element,
    position,
    multiplier: isCaptain ? 2 : 1,
    is_captain: isCaptain,
    is_vice_captain: false,
  };
}

function strongTestTeam(): FplEntryGameweekPicks {
  return {
    active_chip: null,
    automatic_subs: [],
    entry_history: {
      event: 37,
      points: 0,
      total_points: 0,
      rank: 0,
      rank_sort: 0,
      overall_rank: 38_859,
      event_transfers: 0,
      event_transfers_cost: 0,
      points_on_bench: 0,
    },
    picks: [
      makePick(1, 1),
      makePick(2, 2),
      makePick(7, 3),
      makePick(15, 4),
      makePick(4, 5),
      makePick(6, 6, true),
      makePick(10, 7),
      makePick(11, 8),
      makePick(9, 9),
      makePick(12, 10),
      makePick(13, 11),
      makePick(8, 12),
      makePick(3, 13),
      makePick(14, 14),
      makePick(5, 15),
    ],
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Manager pool is reproducible for a fixed seed', ({ Given, When, Then, And }) => {
    let seed = 0;
    let first: ReturnType<typeof buildManagerPool>;
    let second: ReturnType<typeof buildManagerPool>;

    Given('a 15-player squad and pool seed 20260516', () => {
      seed = 20260516;
    });

    When('I build a manager pool of 200 entries twice', () => {
      first = buildManagerPool({ gw: 37, seed, size: 200, squad: SQUAD });
      second = buildManagerPool({ gw: 37, seed, size: 200, squad: SQUAD });
    });

    Then('both pools are identical', () => {
      expect(second.managers).toEqual(first.managers);
      expect(first.managers).toHaveLength(200);
    });

    And('every manager fields a legal 11-player starting XI captained from within it', () => {
      for (const manager of first.managers) {
        expect(manager.xi).toHaveLength(11);
        expect(new Set(manager.xi).size).toBe(11);
        expect(manager.xi).toContain(manager.captain);
        const counts: Record<number, number> = {};
        for (const id of manager.xi) counts[typeOf(id)] = (counts[typeOf(id)] ?? 0) + 1;
        expect(counts[GK_TYPE]).toBe(1);
        expect(counts[DEF_TYPE]).toBeGreaterThanOrEqual(3);
        expect(counts[DEF_TYPE]).toBeLessThanOrEqual(5);
        expect(counts[MID_TYPE]).toBeGreaterThanOrEqual(2);
        expect(counts[MID_TYPE]).toBeLessThanOrEqual(5);
        expect(counts[FWD_TYPE]).toBeGreaterThanOrEqual(1);
        expect(counts[FWD_TYPE]).toBeLessThanOrEqual(3);
      }
    });
  });

  Scenario(
    'Expected curve is reproducible and converges as my entry outscores the pool',
    ({ Given, When, Then, And }) => {
      let rows: RecordingRow[];
      let testTeam: FplEntryGameweekPicks;
      let distribution: ReturnType<typeof buildManagerPool>;
      let first: ReturnType<typeof buildExpectedCurve>;
      let second: ReturnType<typeof buildExpectedCurve>;

      Given('a replayed recording where my entry outscores the synthetic pool', () => {
        rows = [
          makeFrame('2026-05-16T11:00:00.000Z', {}),
          makeFrame('2026-05-16T11:30:00.000Z', { 6: 6, 9: 4, 4: 3, 11: 3 }),
          makeFrame('2026-05-16T12:30:00.000Z', { 6: 13, 9: 10, 4: 9, 11: 8, 10: 6, 12: 6, 1: 6 }),
        ];
        testTeam = strongTestTeam();
        distribution = buildManagerPool({ gw: 37, seed: 20260516, size: 500, squad: SQUAD });
      });

      When('I build the expected curve twice', () => {
        const args = {
          gw: 37,
          rows,
          testTeam,
          distribution,
          bootstrap: EMPTY_BOOTSTRAP,
          preGwRank: 38_859,
          totalManagers: 10_900_000,
        };
        first = buildExpectedCurve(args);
        second = buildExpectedCurve(args);
      });

      Then('both curves are identical', () => {
        expect(second).toEqual(first);
        expect(first.frames).toHaveLength(3);
      });

      And('my final live rank is better than my pre-gameweek rank', () => {
        expect(first.officialEndRank).toBeLessThan(first.preGwRank);
      });

      And('the official end-of-gameweek rank matches the final frame', () => {
        const last = first.frames[first.frames.length - 1];
        expect(last?.expectedRank).toBe(first.officialEndRank);
      });
    }
  );

  Scenario(
    'Parsing a recording skips malformed rows and orders by timestamp',
    ({ Given, When, Then }) => {
      let text = '';
      let rows: RecordingRow[];

      Given('a jsonl recording with blank, malformed and out-of-order rows', () => {
        const later = makeFrame('2026-05-16T12:00:00.000Z', { 6: 13 });
        const earlier = makeFrame('2026-05-16T11:00:00.000Z', { 6: 2 });
        text = [
          JSON.stringify(later),
          '',
          'not json',
          JSON.stringify({ ts: '2026-05-16T11:30:00.000Z', gw: 37, bodyHash: 'meta-only' }),
          JSON.stringify(earlier),
        ].join('\n');
      });

      When('I parse and normalise the recording', () => {
        rows = normaliseRecordingRows(parseRecording(text));
      });

      Then('only the valid rows remain, ordered by timestamp', () => {
        expect(rows).toHaveLength(2);
        expect(rows[0]?.ts).toBe('2026-05-16T11:00:00.000Z');
        expect(rows[1]?.ts).toBe('2026-05-16T12:00:00.000Z');
      });
    }
  );
});
