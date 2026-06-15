import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplLiveGameweek } from '@simplyfpl/types';

import {
  type CaptureBucket,
  GW38_CAPTURE_CRON,
  GW38_RECORDING_KEY,
  captureSnapshotToR2,
} from './gw38-capture';
import { parseRecording } from './replay';

function makeLive(totalPoints: number): FplLiveGameweek {
  return {
    elements: [
      {
        id: 1,
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
      },
    ],
  };
}

interface FakeBucket extends CaptureBucket {
  store: Map<string, string>;
  putCalls: number;
}

function createFakeBucket(): FakeBucket {
  const store = new Map<string, string>();
  const bucket: FakeBucket = {
    store,
    putCalls: 0,
    async get(key: string) {
      const value = store.get(key);
      if (value === undefined) return null;
      return { text: async () => value };
    },
    async put(key: string, value: string) {
      store.set(key, value);
      bucket.putCalls += 1;
    },
  };
  return bucket;
}

interface ScenarioContext {
  bucket: FakeBucket;
  captured: boolean;
}

const feature = await loadFeature('./gw38-capture.feature');

describeFeature(feature, ({ Scenario }) => {
  let ctx: ScenarioContext;

  Scenario('Capture is a no-op outside the gw38 window', ({ Given, When, Then }) => {
    Given('an R2 recording bucket', () => {
      ctx = { bucket: createFakeBucket(), captured: false };
    });
    When('a gw38 snapshot is captured at "2026-05-24T13:59:59.000Z"', async () => {
      ctx.captured = await captureSnapshotToR2(
        ctx.bucket,
        38,
        makeLive(5),
        Date.parse('2026-05-24T13:59:59.000Z')
      );
    });
    Then('nothing is written to R2', () => {
      expect(ctx.captured).toBe(false);
      expect(ctx.bucket.putCalls).toBe(0);
      expect(ctx.bucket.store.size).toBe(0);
    });
  });

  Scenario('Capture writes a jsonl row inside the window', ({ Given, When, Then }) => {
    Given('an R2 recording bucket', () => {
      ctx = { bucket: createFakeBucket(), captured: false };
    });
    When('a gw38 snapshot is captured at "2026-05-24T15:30:00.000Z"', async () => {
      ctx.captured = await captureSnapshotToR2(
        ctx.bucket,
        38,
        makeLive(7),
        Date.parse('2026-05-24T15:30:00.000Z')
      );
    });
    Then('the recording has one jsonl row for gw 38', () => {
      expect(ctx.captured).toBe(true);
      const text = ctx.bucket.store.get(GW38_RECORDING_KEY);
      if (text === undefined) throw new Error('no recording written');
      const rows = parseRecording(text);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.gw).toBe(38);
    });
  });

  Scenario('Captured rows match the gw36 recording row shape', ({ Given, When, Then }) => {
    Given('an R2 recording bucket', () => {
      ctx = { bucket: createFakeBucket(), captured: false };
    });
    When('a gw38 snapshot is captured at "2026-05-24T15:30:00.000Z"', async () => {
      ctx.captured = await captureSnapshotToR2(
        ctx.bucket,
        38,
        makeLive(7),
        Date.parse('2026-05-24T15:30:00.000Z')
      );
    });
    Then('the captured row has the same shape as a gw36 recording row', () => {
      const text = ctx.bucket.store.get(GW38_RECORDING_KEY);
      if (text === undefined) throw new Error('no recording written');
      const line = text.trim();
      const parsed: unknown = JSON.parse(line);
      if (!parsed || typeof parsed !== 'object') throw new Error('captured row is not an object');
      const gw36Row = { ts: '2026-05-13T18:04:59.106Z', gw: 36, data: makeLive(2) };
      expect(Object.keys(parsed).sort()).toEqual(Object.keys(gw36Row).sort());
      const rows = parseRecording(line);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.data.elements[0]?.stats).toHaveProperty('total_points');
    });
  });

  Scenario('The capture cron uses a Cloudflare-valid weekday', ({ Then, And }) => {
    let fields: string[];

    Then('the capture cron has five fields', () => {
      fields = GW38_CAPTURE_CRON.trim().split(/\s+/);
      expect(fields).toHaveLength(5);
    });
    And("the capture cron weekday field is within Cloudflare's 1 to 7 range", () => {
      const weekday = Number(fields[4]);
      expect(Number.isInteger(weekday)).toBe(true);
      expect(weekday).toBeGreaterThanOrEqual(1);
      expect(weekday).toBeLessThanOrEqual(7);
    });
  });
});
