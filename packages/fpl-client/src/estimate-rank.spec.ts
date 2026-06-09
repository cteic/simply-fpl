import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';

import type { RankDistribution } from '@simplyfpl/types';

import {
  DistributionUnavailableError,
  estimateLiveRankFromDistribution,
  estimateRankFromScore,
  hasDistribution,
  loadDistribution,
  scoreToPercentile,
} from './estimate-rank';
import { estimateLiveRank } from './live-rank';
import { DISTRIBUTION_GAMEWEEKS } from './score-distributions/distributions.generated';

const feature = await loadFeature('./estimate-rank.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'A score below the captured floor clamps to the bottom of the table',
    ({ Given, And, When, Then }) => {
      let distribution: RankDistribution;
      let totalEntries = 0;
      let rank = 0;

      Given('the GW20 overall distribution', () => {
        distribution = loadDistribution(20, 'overall');
      });

      And('a total population of 13,000,000 managers', () => {
        totalEntries = 13_000_000;
      });

      When('I estimate the rank for a score of 0', () => {
        rank = estimateRankFromScore(0, distribution, totalEntries);
      });

      Then('the estimated rank is 13,000,000', () => {
        expect(rank).toBe(13_000_000);
      });
    }
  );

  Scenario('A score at the cohort maximum clamps to rank 1', ({ Given, And, When, Then }) => {
    let distribution: RankDistribution;
    let totalEntries = 0;
    let rank = 0;

    Given('the GW20 overall distribution', () => {
      distribution = loadDistribution(20, 'overall');
    });

    And('a total population of 13,000,000 managers', () => {
      totalEntries = 13_000_000;
    });

    When('I estimate the rank for the cohort maximum score', () => {
      rank = estimateRankFromScore(distribution.max, distribution, totalEntries);
    });

    Then('the estimated rank is 1', () => {
      expect(rank).toBe(1);
    });
  });

  Scenario(
    'A score sitting exactly on a captured percentile maps to that percentile',
    ({ Given, When, Then }) => {
      let distribution: RankDistribution;
      let percentile = 0;

      Given('the GW20 overall distribution', () => {
        distribution = loadDistribution(20, 'overall');
      });

      When('I locate the percentile for a score of 44', () => {
        percentile = scoreToPercentile(44, distribution);
      });

      Then('the percentile is 50', () => {
        expect(percentile).toBeCloseTo(50, 5);
      });
    }
  );

  Scenario(
    'Scores between captured percentile bins use linear interpolation',
    ({ Given, When, Then }) => {
      let distribution: RankDistribution;
      let percentile = 0;

      Given('the GW20 overall distribution', () => {
        distribution = loadDistribution(20, 'overall');
      });

      When('I locate the percentile for a score of 50', () => {
        percentile = scoreToPercentile(50, distribution);
      });

      Then('the percentile is between 50 and 75', () => {
        expect(percentile).toBeGreaterThan(50);
        expect(percentile).toBeLessThan(75);
        const p50 = distribution.percentiles.p50;
        const p75 = distribution.percentiles.p75;
        const expected = 50 + (75 - 50) * ((50 - p50) / (p75 - p50));
        expect(percentile).toBeCloseTo(expected, 5);
      });
    }
  );

  Scenario(
    'A score above the 99th percentile extrapolates into the histogram tail',
    ({ Given, When, Then }) => {
      let distribution: RankDistribution;
      let percentile = 0;

      Given('the GW20 overall distribution', () => {
        distribution = loadDistribution(20, 'overall');
      });

      When('I locate the percentile for a score that is one short of the max', () => {
        percentile = scoreToPercentile(distribution.max - 1, distribution);
      });

      Then('the percentile is above 99 and at most 100', () => {
        expect(percentile).toBeGreaterThan(99);
        expect(percentile).toBeLessThanOrEqual(100);
      });
    }
  );

  Scenario('Realistic GW20 score maps to a sensible overall rank', ({ Given, And, When, Then }) => {
    let distribution: RankDistribution;
    let totalEntries = 0;
    let rank = 0;

    Given('the GW20 overall distribution', () => {
      distribution = loadDistribution(20, 'overall');
    });

    And('a total population of 13,000,000 managers', () => {
      totalEntries = 13_000_000;
    });

    When('I estimate the rank for a score of 65', () => {
      rank = estimateRankFromScore(65, distribution, totalEntries);
    });

    Then('the estimated rank sits between rank 750,000 and rank 2,000,000', () => {
      expect(rank).toBeGreaterThan(750_000);
      expect(rank).toBeLessThan(2_000_000);
    });
  });

  Scenario(
    'GW38 above-average score departs meaningfully from the flat-700 baseline',
    ({ Given, And, When, Then }) => {
      let distribution: RankDistribution;
      let totalEntries = 0;
      let preGwRank = 0;
      let livePoints = 0;
      let avgEntryScore = 0;
      let newRank = 0;
      let flatRank = 0;

      Given('the GW38 overall distribution', () => {
        distribution = loadDistribution(38, 'overall');
      });

      And('a total population of 13,100,000 managers', () => {
        totalEntries = 13_100_000;
      });

      And('a pre-gameweek overall rank of 100,000', () => {
        preGwRank = 100_000;
      });

      And('a GW score of 70 against a GW average of 45', () => {
        livePoints = 70;
        avgEntryScore = 45;
      });

      When('I estimate the live rank under the new percentile model', () => {
        newRank = estimateRankFromScore(livePoints, distribution, totalEntries);
      });

      And('I estimate the live rank under the old flat-700 heuristic', () => {
        flatRank = estimateLiveRank(preGwRank, livePoints, avgEntryScore).liveRank;
      });

      Then('the two estimates differ by at least 200,000 ranks', () => {
        const gap = Math.abs(newRank - flatRank);
        expect(gap).toBeGreaterThanOrEqual(200_000);
      });
    }
  );

  Scenario(
    'Every captured gameweek is loadable for both the overall and top_10k cohorts',
    ({ When, Then }) => {
      let loaded: RankDistribution[] = [];

      When("I load every captured gameweek's overall and top_10k distribution", () => {
        loaded = [];
        for (const gw of DISTRIBUTION_GAMEWEEKS) {
          loaded.push(loadDistribution(gw, 'overall'));
          loaded.push(loadDistribution(gw, 'top_10k'));
        }
      });

      Then('no load throws and every distribution carries a non-empty histogram', () => {
        expect(loaded.length).toBe(DISTRIBUTION_GAMEWEEKS.length * 2);
        for (const dist of loaded) {
          expect(dist.histogram.length).toBeGreaterThan(0);
          expect(dist.sampleSize).toBeGreaterThan(0);
        }
      });
    }
  );
});

describe('loadDistribution failure modes', () => {
  it('throws DistributionUnavailableError for a gameweek with no captured data', () => {
    expect(() => loadDistribution(99, 'overall')).toThrow(DistributionUnavailableError);
  });

  it('reports hasDistribution false for unknown gameweeks', () => {
    expect(hasDistribution(99, 'overall')).toBe(false);
  });
});

describe('estimateLiveRankFromDistribution', () => {
  it('signals an upward move when the live rank is better than the pre-GW rank', () => {
    const distribution = loadDistribution(20, 'overall');
    const estimate = estimateLiveRankFromDistribution(13_000_000, 75, distribution, 13_000_000);
    expect(estimate.direction).toBe('up');
    expect(estimate.movement).toBeGreaterThan(0);
    expect(estimate.liveRank).toBeLessThan(13_000_000);
  });

  it('signals a downward move when the live rank is worse than the pre-GW rank', () => {
    const distribution = loadDistribution(20, 'overall');
    const estimate = estimateLiveRankFromDistribution(1, 20, distribution, 13_000_000);
    expect(estimate.direction).toBe('down');
    expect(estimate.movement).toBeLessThan(0);
    expect(estimate.liveRank).toBeGreaterThan(1);
  });

  it('rejects non-positive totalEntries', () => {
    const distribution = loadDistribution(20, 'overall');
    expect(() => estimateRankFromScore(50, distribution, 0)).toThrow();
    expect(() => estimateRankFromScore(50, distribution, -1)).toThrow();
  });
});
