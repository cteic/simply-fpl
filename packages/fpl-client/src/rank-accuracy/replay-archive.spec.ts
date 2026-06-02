import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

import { loadArchive } from './archive-reader';
import type {
  ArchiveBootstrap,
  ArchiveEntry,
  ReplayResult,
  ReplaySample,
  ScoredSample,
} from './replay-archive';
import { buildSamplesForEntry, replayArchive, scoreSample } from './replay-archive';

const feature = await loadFeature('./replay-archive.feature');

const ARCHIVE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'var',
  'season-archive'
);

// Recorded flat-700 baseline (RFC 006 Phase 1). These are the measured median
// absolute percent errors of the SHIPPING estimateLiveRank against the
// committed 2025-26 archive (league 936326, 2232 net-points pairs). The gate
// asserts the model does not regress PAST these ceilings; Phase 2 tightens them
// to the new model's results.
const BASELINE_OVERALL_MEDIAN_ABS_PCT = 0.15;
const BASELINE_TOP_100K_MEDIAN_ABS_PCT = 0.4;

function topBandMedianAbsPct(result: ReplayResult): number {
  const top = result.bands.filter((band) => band.upperRank <= 100_000);
  const weighted = top.reduce(
    (acc, band) => {
      acc.errorSum += band.medianAbsPctError * band.count;
      acc.count += band.count;
      return acc;
    },
    { errorSum: 0, count: 0 }
  );
  return weighted.count === 0 ? Number.NaN : weighted.errorSum / weighted.count;
}

function topBandMedianSigned(result: ReplayResult): number {
  const top = result.bands.filter((band) => band.upperRank <= 100_000);
  const weighted = top.reduce(
    (acc, band) => {
      acc.signedSum += band.medianSignedError * band.count;
      acc.count += band.count;
      return acc;
    },
    { signedSum: 0, count: 0 }
  );
  return weighted.count === 0 ? Number.NaN : weighted.signedSum / weighted.count;
}

function makeEntry(overallRanks: number[]): ArchiveEntry {
  return {
    entryId: 1,
    current: overallRanks.map((overallRank, index) => ({
      event: index + 1,
      points: 50,
      overall_rank: overallRank,
      event_transfers_cost: 0,
    })),
  };
}

function makeBootstrap(averageByEvent: Record<number, number>): ArchiveBootstrap {
  return {
    totalPlayers: 13_104_126,
    averageEntryScoreByEvent: new Map(
      Object.entries(averageByEvent).map(([event, avg]) => [Number(event), avg])
    ),
  };
}

function firstSample(samples: ReplaySample[]): ReplaySample {
  const sample = samples[0];
  if (!sample) throw new Error('expected at least one sample');
  return sample;
}

function makeSample(overrides: Partial<ReplaySample>): ReplaySample {
  return {
    entryId: 1,
    gw: 2,
    preGwRank: 1_000_000,
    grossPoints: 50,
    netPoints: 50,
    avgEntryScore: 50,
    trueRank: 1_000_000,
    ...overrides,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A finished gameweek becomes a scorable sample', ({ Given, And, When, Then }) => {
    let entry: ArchiveEntry;
    let bootstrap: ArchiveBootstrap;
    let samples: ReplaySample[];
    Given('an archived entry with end-of-GW overall ranks 2000000 then 1500000', () => {
      entry = makeEntry([2_000_000, 1_500_000]);
    });
    And('the bootstrap average for GW2 is 50', () => {
      bootstrap = makeBootstrap({ 2: 50 });
    });
    When('I build the replay samples for that entry', () => {
      samples = buildSamplesForEntry(entry, bootstrap);
    });
    Then('there is one sample for GW2', () => {
      expect(samples).toHaveLength(1);
      expect(firstSample(samples).gw).toBe(2);
    });
    And('its pre-GW rank is 2000000', () => {
      expect(firstSample(samples).preGwRank).toBe(2_000_000);
    });
    And('its true rank is 1500000', () => {
      expect(firstSample(samples).trueRank).toBe(1_500_000);
    });
  });

  Scenario('GW1 cannot be scored because it has no prior rank', ({ Given, And, When, Then }) => {
    let entry: ArchiveEntry;
    let bootstrap: ArchiveBootstrap;
    let samples: ReplaySample[];
    Given('an archived entry with end-of-GW overall ranks 2000000 then 1500000', () => {
      entry = makeEntry([2_000_000, 1_500_000]);
    });
    And('the bootstrap average for GW2 is 50', () => {
      bootstrap = makeBootstrap({ 2: 50 });
    });
    When('I build the replay samples for that entry', () => {
      samples = buildSamplesForEntry(entry, bootstrap);
    });
    Then('no sample is built for GW1', () => {
      expect(samples.some((sample) => sample.gw === 1)).toBe(false);
    });
  });

  Scenario('Net points subtract the transfer hit, gross points do not', ({ Given, And, Then }) => {
    let entry: ArchiveEntry;
    let samples: ReplaySample[];
    Given('a replay sample with gross points 92 and a transfer cost of 4', () => {
      entry = {
        entryId: 1,
        current: [
          { event: 1, points: 60, overall_rank: 2_000_000, event_transfers_cost: 0 },
          { event: 2, points: 92, overall_rank: 1_500_000, event_transfers_cost: 4 },
        ],
      };
      samples = buildSamplesForEntry(entry, makeBootstrap({ 2: 50 }));
    });
    Then('the gross points are 92', () => {
      expect(firstSample(samples).grossPoints).toBe(92);
    });
    And('the net points are 88', () => {
      expect(firstSample(samples).netPoints).toBe(88);
    });
  });

  Scenario('An above-average score is predicted to climb the table', ({ Given, When, Then }) => {
    let sample: ReplaySample;
    let scored: ScoredSample;
    Given('a replay sample with pre-GW rank 1000000 scoring 80 against an average of 50', () => {
      sample = makeSample({
        preGwRank: 1_000_000,
        grossPoints: 80,
        netPoints: 80,
        avgEntryScore: 50,
        trueRank: 900_000,
      });
    });
    When('I score the sample in gross mode', () => {
      scored = scoreSample(sample, 'gross');
    });
    Then('the predicted rank is higher up the table than the pre-GW rank', () => {
      expect(scored.predictedRank).toBeLessThan(sample.preGwRank);
    });
  });

  Scenario(
    'The flat-700 baseline error stays at or below the recorded ceiling',
    ({ Given, When, Then, And }) => {
      let entries: ArchiveEntry[];
      let bootstrap: ArchiveBootstrap;
      let result: ReplayResult;
      Given('the committed season archive', () => {
        const archive = loadArchive(ARCHIVE_ROOT, {});
        entries = archive.entries;
        bootstrap = archive.bootstrap;
        expect(entries.length).toBeGreaterThan(0);
      });
      When('I replay it against the shipping estimator in net mode', () => {
        result = replayArchive(entries, bootstrap, 'net');
        expect(result.count).toBeGreaterThan(0);
      });
      Then('the overall median absolute percent error is at or below the recorded baseline', () => {
        expect(result.medianAbsPctError).toBeLessThanOrEqual(BASELINE_OVERALL_MEDIAN_ABS_PCT);
      });
      And('the top-100k median absolute percent error is at or below the recorded baseline', () => {
        expect(topBandMedianAbsPct(result)).toBeLessThanOrEqual(BASELINE_TOP_100K_MEDIAN_ABS_PCT);
      });
      And('the top-100k signed bias is negative', () => {
        expect(topBandMedianSigned(result)).toBeLessThan(0);
      });
    }
  );
});
