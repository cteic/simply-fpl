import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';

import type { RankCurve, RankCurveSample } from '@simplyfpl/types';

import { estimateLiveRankFromCurve } from './live-rank';
import { buildRankCurve, formatCompactRank, pointsForRank, rankForPoints } from './rank-curve';

const feature = await loadFeature('./rank-curve.feature');

/** Field size when the GW11 2026/27 pages were sampled (`events[10].ranked_count`). */
const GW11_RANKED_COUNT = 11_261_396;

/**
 * Median absolute error the curve achieves on the held-out pages. Measured at
 * 1.17%; the assertion leaves headroom so resampling noise does not fail the
 * build, but a real regression towards the flat heuristic's 12.6% will.
 */
const CURVE_MEDIAN_ABS_PCT_RATCHET = 2.5;

function readSamples(file: string, hasPageColumn: boolean): RankCurveSample[] {
  const text = readFileSync(join(__dirname, 'rank-accuracy', file), 'utf8');
  const samples: RankCurveSample[] = [];
  for (const line of text.split('\n').slice(1)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const cols = trimmed.split('\t');
    const rankCol = hasPageColumn ? cols[1] : cols[0];
    const pointsCol = hasPageColumn ? cols[2] : cols[1];
    if (rankCol === undefined || pointsCol === undefined) continue;
    samples.push({ rank: Number(rankCol), totalPoints: Number(pointsCol) });
  }
  return samples;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted[mid] ?? 0;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A curve needs enough samples to interpolate between', ({ Given, When, Then }) => {
    let samples: RankCurveSample[];
    let curve: RankCurve | null;

    Given('only three sampled pages', () => {
      samples = [
        { rank: 1, totalPoints: 855 },
        { rank: 50, totalPoints: 818 },
        { rank: 100, totalPoints: 800 },
      ];
    });

    When('I build a curve from them', () => {
      curve = buildRankCurve({ gw: 11, rankedCount: GW11_RANKED_COUNT, samples });
    });

    Then('the curve is rejected', () => {
      expect(curve).toBeNull();
    });
  });

  Scenario('The curve maps a total to a rank', ({ Given, When, Then, And }) => {
    let samples: RankCurveSample[];
    let curve: RankCurve;

    Given('the sampled GW11 global league pages', () => {
      samples = readSamples('gw11-points-to-rank-curve.tsv', true);
      expect(samples.length).toBeGreaterThan(30);
    });

    When('I build a curve from them', () => {
      const built = buildRankCurve({ gw: 11, rankedCount: GW11_RANKED_COUNT, samples });
      expect(built).not.toBeNull();
      if (built === null) throw new Error('curve should build from the sampled pages');
      curve = built;
    });

    Then("looking up a sampled total returns that sample's rank", () => {
      // page 1000 of the sampled set: rank 49,929 on 748 points
      expect(rankForPoints(curve, 748)).toBe(49_929);
    });

    And('looking up a total between two samples interpolates between their ranks', () => {
      // 605 -> 4,399,904 and 622 -> 3,549,169, so 614 must land between them
      const mid = rankForPoints(curve, 614);
      expect(mid).toBeGreaterThan(3_549_169);
      expect(mid).toBeLessThan(4_399_904);
    });

    And('a total above the best sample clamps to rank 1', () => {
      expect(rankForPoints(curve, 2_000)).toBe(1);
    });

    And('a total below the worst sample clamps to the field size', () => {
      expect(rankForPoints(curve, 0)).toBe(GW11_RANKED_COUNT);
    });
  });

  Scenario('The curve inverts to answer what a rank is worth', ({ Given, When, Then, And }) => {
    let curve: RankCurve;

    Given('the sampled GW11 global league pages', () => {
      const built = buildRankCurve({
        gw: 11,
        rankedCount: GW11_RANKED_COUNT,
        samples: readSamples('gw11-points-to-rank-curve.tsv', true),
      });
      if (built === null) throw new Error('curve should build from the sampled pages');
      curve = built;
    });

    When('I build a curve from them', () => {
      expect(curve.points.length).toBeGreaterThan(30);
    });

    Then("asking what rank 49929 is worth returns that sample's total", () => {
      expect(pointsForRank(curve, 49_929)).toBe(748);
    });

    And('a round trip from total to rank and back lands on the same total', () => {
      const rank = rankForPoints(curve, 700);
      expect(pointsForRank(curve, rank)).toBe(700);
    });
  });

  Scenario('The curve beats the flat heuristic on held-out pages', ({ Given, When, Then, And }) => {
    let curve: RankCurve;
    let holdout: RankCurveSample[];
    let errorsPct: number[];

    Given('the sampled GW11 global league pages', () => {
      const built = buildRankCurve({
        gw: 11,
        rankedCount: GW11_RANKED_COUNT,
        samples: readSamples('gw11-points-to-rank-curve.tsv', true),
      });
      if (built === null) throw new Error('curve should build from the sampled pages');
      curve = built;
    });

    And('twenty held-out pages the sampler never saw', () => {
      holdout = readSamples('gw11-points-to-rank-holdout.tsv', false);
      expect(holdout).toHaveLength(20);
    });

    When('I build a curve from them', () => {
      errorsPct = holdout.map((sample) => {
        const estimated = rankForPoints(curve, sample.totalPoints);
        return (Math.abs(estimated - sample.rank) / sample.rank) * 100;
      });
    });

    Then('the median absolute rank error stays at or below the measured ratchet', () => {
      expect(median(errorsPct)).toBeLessThanOrEqual(CURVE_MEDIAN_ABS_PCT_RATCHET);
    });

    And("the curve reproduces a known entry's published overall rank", () => {
      // entry 219895 after GW11: 606 points, FPL reports overall_rank 4,362,395
      const estimated = rankForPoints(curve, 606);
      const errorPct = (Math.abs(estimated - 4_362_395) / 4_362_395) * 100;
      expect(errorPct).toBeLessThan(1);
    });
  });

  Scenario(
    'A live estimate shifts the field by what it has scored',
    ({ Given, When, Then, And }) => {
      let curve: RankCurve;
      let estimate: ReturnType<typeof estimateLiveRankFromCurve>;

      Given('the sampled GW11 global league pages', () => {
        const built = buildRankCurve({
          gw: 11,
          rankedCount: GW11_RANKED_COUNT,
          samples: readSamples('gw11-points-to-rank-curve.tsv', true),
        });
        if (built === null) throw new Error('curve should build from the sampled pages');
        curve = built;
      });

      When('I build a curve from them', () => {
        expect(curve.rankedCount).toBe(GW11_RANKED_COUNT);
      });

      And(
        'a manager on 581 points before the gameweek scores 25 while the field averages 35',
        () => {
          estimate = estimateLiveRankFromCurve({
            curve,
            preGwTotal: 581,
            livePoints: 25,
            fieldLiveAverage: 35,
            preGwRank: 3_797_347,
          });
        }
      );

      Then('the estimate comes from the official curve', () => {
        expect(estimate.source).toBe('official-curve');
      });

      And('the estimate is worse than their pre-gameweek rank', () => {
        // 581 + 25 - 35 = 571 against a pre-GW total of 581: scoring 10 under the
        // average must cost places, so the rank number must rise.
        expect(estimate.liveRank).toBeGreaterThan(3_797_347);
        expect(estimate.direction).toBe('down');
      });
    }
  );

  Scenario('Ranks shorten for a label only when they are round', ({ Given, When, Then, And }) => {
    let shortened: string[];

    Given('no curve is needed', () => {
      shortened = [];
    });

    When('I shorten some ranks', () => {
      shortened = [10_000, 1_000_000, 4_362_395, 0].map(formatCompactRank);
    });

    Then('10000 reads as 10k and 1000000 as 1M', () => {
      expect(shortened[0]).toBe('10k');
      expect(shortened[1]).toBe('1M');
    });

    And('an arbitrary rank keeps all its digits', () => {
      expect(shortened[2]).toBe((4_362_395).toLocaleString());
      expect(shortened[3]).toBe('\u2014');
    });
  });
});
