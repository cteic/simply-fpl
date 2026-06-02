import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { ScoreDistribution } from '@simplyfpl/types';

import { computeScoreDistribution } from './score-distribution';

const feature = await loadFeature('./score-distribution.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Percentiles and summary stats over an evenly spaced sample',
    ({ Given, When, Then, And }) => {
      let scores: number[] = [];
      let result: ScoreDistribution;

      Given('a score sample of 10, 20, 30, 40 and 50', () => {
        scores = [10, 20, 30, 40, 50];
      });

      When('I compute the score distribution', () => {
        result = computeScoreDistribution(scores);
      });

      Then('the sample size is 5 with min 10, max 50 and mean 30', () => {
        expect(result.sampleSize).toBe(5);
        expect(result.min).toBe(10);
        expect(result.max).toBe(50);
        expect(result.mean).toBe(30);
      });

      And('the median is 30 with p25 20 and p75 40', () => {
        expect(result.median).toBe(30);
        expect(result.percentiles.p25).toBe(20);
        expect(result.percentiles.p75).toBe(40);
      });
    }
  );

  Scenario('Histogram buckets scores into fixed-width bins', ({ Given, When, Then, And }) => {
    let scores: number[] = [];
    let result: ScoreDistribution;

    Given('a score sample of 50, 52, 54, 55, 60 and 61 with bin size 5', () => {
      scores = [50, 52, 54, 55, 60, 61];
    });

    When('I compute the score distribution', () => {
      result = computeScoreDistribution(scores, { binSize: 5 });
    });

    Then('the histogram spans bins from 50 to 65', () => {
      expect(result.histogram[0]?.min).toBe(50);
      expect(result.histogram[result.histogram.length - 1]?.max).toBe(65);
    });

    And('the bin starting at 50 holds 3 scores and the bin starting at 60 holds 2 scores', () => {
      const binAt50 = result.histogram.find((bin) => bin.min === 50);
      const binAt60 = result.histogram.find((bin) => bin.min === 60);
      expect(binAt50?.count).toBe(3);
      expect(binAt60?.count).toBe(2);
    });
  });

  Scenario('A single-manager sample collapses to one value', ({ Given, When, Then }) => {
    let scores: number[] = [];
    let result: ScoreDistribution;

    Given('a score sample of 42', () => {
      scores = [42];
    });

    When('I compute the score distribution', () => {
      result = computeScoreDistribution(scores);
    });

    Then('every percentile equals 42 and the sample size is 1', () => {
      expect(result.sampleSize).toBe(1);
      expect(result.percentiles.p1).toBe(42);
      expect(result.percentiles.p50).toBe(42);
      expect(result.percentiles.p99).toBe(42);
    });
  });

  Scenario('An empty sample cannot produce a distribution', ({ Given, When, Then }) => {
    let run: () => void = () => {};

    Given('an empty score sample', () => {});

    When('I compute the score distribution expecting failure', () => {
      run = () => computeScoreDistribution([]);
    });

    Then('it throws an error', () => {
      expect(run).toThrow();
    });
  });
});
