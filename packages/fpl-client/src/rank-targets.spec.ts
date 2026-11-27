import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  FplBootstrapStatic,
  FplEvent,
  RankCurve,
  RankCurveSample,
  RankTargets,
} from '@simplyfpl/types';

import { buildRankCurve, rankForPoints } from './rank-curve';
import {
  computeRankTargets,
  DEFAULT_TARGET_RANKS,
  REACHABLE_GW_POINTS,
  seasonHighestGwScore,
} from './rank-targets';

const feature = await loadFeature('./rank-targets.feature');

const GW11_RANKED_COUNT = 11_261_396;
const FIELD_AVERAGE = 35;

function gw11Curve(): RankCurve {
  const text = readFileSync(
    join(__dirname, 'rank-accuracy', 'gw11-points-to-rank-curve.tsv'),
    'utf8'
  );
  const samples: RankCurveSample[] = [];
  for (const line of text.split('\n').slice(1)) {
    const cols = line.trim().split('\t');
    if (cols.length < 3) continue;
    const [, rank, total] = cols;
    if (rank === undefined || total === undefined) continue;
    samples.push({ rank: Number(rank), totalPoints: Number(total) });
  }
  const curve = buildRankCurve({ gw: 11, rankedCount: GW11_RANKED_COUNT, samples });
  if (curve === null) throw new Error('GW11 curve should build');
  return curve;
}

/**
 * Entry 219895 going into GW12, with 25 scored so far. Its pre-gameweek total
 * and rank are the real post-GW11 figures FPL reports, 606 and 4,362,395, so
 * the fixture is on the same generation as the GW11 curve.
 */
function midTable(curve: RankCurve, ranks?: readonly number[]): RankTargets | null {
  return computeRankTargets({
    curve,
    gw: 12,
    preGwTotal: 606,
    livePoints: 25,
    fieldLiveAverage: FIELD_AVERAGE,
    preGwRank: 4_362_395,
    ...(ranks === undefined ? {} : { ranks }),
  });
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A target round-trips back to the rank it was asked for', ({ Given, When, Then }) => {
    let curve: RankCurve;
    let result: RankTargets | null;

    Given('the GW11 curve and a manager on 606 points before the gameweek', () => {
      curve = gw11Curve();
    });

    When('I compute their rank targets', () => {
      result = midTable(curve);
    });

    Then("feeding each target's total back through the curve returns its rank", () => {
      expect(result).not.toBeNull();
      if (result === null) return;
      expect(result.targets.length).toBeGreaterThan(0);
      for (const target of result.targets) {
        // The live estimate is curve(total - fieldAverage), so inverting a
        // target must land back on the rank it was built for. The target total
        // is rounded to whole points, so the round trip is bracketed by the
        // ranks one point either side rather than being exact.
        const landed = rankForPoints(curve, target.totalPointsNeeded - FIELD_AVERAGE);
        const onePointBetter = rankForPoints(curve, target.totalPointsNeeded + 1 - FIELD_AVERAGE);
        const onePointWorse = rankForPoints(curve, target.totalPointsNeeded - 1 - FIELD_AVERAGE);
        expect(landed).toBeLessThanOrEqual(onePointWorse);
        expect(landed).toBeGreaterThanOrEqual(onePointBetter);
        expect(target.rank).toBeLessThanOrEqual(onePointWorse);
        expect(target.rank).toBeGreaterThanOrEqual(onePointBetter);
      }
    });
  });

  Scenario('Holding position means matching the field', ({ Given, When, Then }) => {
    let curve: RankCurve;
    let result: RankTargets | null;

    Given('the GW11 curve and a manager on 606 points before the gameweek', () => {
      curve = gw11Curve();
    });

    When('I compute their rank targets', () => {
      result = midTable(curve);
    });

    Then('the points needed to hold rank match the field average', () => {
      expect(result).not.toBeNull();
      if (result === null) return;
      // Holding is exactly the field average: a manager keeps their place when
      // their total moves by as much as the distribution shifts.
      // They have 25 of the 35 they need, so 10 still to find.
      expect(result.holdPoints).toBe(FIELD_AVERAGE);
      expect(result.holdFromHere).toBe(10);
    });
  });

  Scenario('The next target is the nearest milestone still ahead', ({ Given, When, Then, And }) => {
    let curve: RankCurve;
    let result: RankTargets | null;

    Given('the GW11 curve and a manager on 606 points before the gameweek', () => {
      curve = gw11Curve();
    });

    When('I compute their rank targets', () => {
      result = midTable(curve);
    });

    Then('the next target is the best milestone better than their live rank', () => {
      expect(result).not.toBeNull();
      if (result === null) return;
      const liveRank = result.liveRank;
      const ahead = DEFAULT_TARGET_RANKS.filter((rank) => rank < liveRank);
      const expected = ahead[ahead.length - 1];
      expect(result.nextTarget?.rank).toBe(expected);
      expect(result.nextTarget?.pointsFromHere).toBeGreaterThan(0);
    });

    And('every milestone worse than their live rank is already achieved', () => {
      expect(result).not.toBeNull();
      if (result === null) return;
      for (const target of result.targets) {
        if (target.rank > result.liveRank) expect(target.achieved).toBe(true);
      }
    });
  });

  Scenario('A manager near the top has a harder next target', ({ Given, When, Then, And }) => {
    let curve: RankCurve;
    let result: RankTargets | null;

    Given('the GW11 curve and a manager on 793 points before the gameweek', () => {
      curve = gw11Curve();
      // 793 is the GW11 total at rank 948, so this manager sits inside the top 1k.
      result = computeRankTargets({
        curve,
        gw: 12,
        preGwTotal: 793,
        livePoints: 35,
        fieldLiveAverage: FIELD_AVERAGE,
        preGwRank: 948,
      });
    });

    When('I compute their rank targets', () => {
      expect(result).not.toBeNull();
    });

    Then('the 10k milestone is already achieved', () => {
      if (result === null) return;
      const tenK = result.targets.find((t) => t.rank === 10_000);
      expect(tenK?.achieved).toBe(true);
      expect(tenK?.pointsFromHere).toBeLessThanOrEqual(0);
    });

    And('reaching 1k still costs points', () => {
      if (result === null) return;
      const oneK = result.targets.find((t) => t.rank === 1_000);
      expect(oneK).toBeDefined();
      expect(oneK?.gwPointsNeeded).toBeGreaterThan(0);
    });
  });

  Scenario('Targets beyond the field are dropped', ({ Given, When, Then }) => {
    let curve: RankCurve;
    let result: RankTargets | null;

    Given('the GW11 curve and a manager on 606 points before the gameweek', () => {
      curve = gw11Curve();
    });

    When('I ask for a target rank past the end of the field', () => {
      result = midTable(curve, [10_000, GW11_RANKED_COUNT + 1, 0, -5]);
    });

    Then('that target is not returned', () => {
      expect(result).not.toBeNull();
      if (result === null) return;
      expect(result.targets.map((t) => t.rank)).toEqual([10_000]);
    });
  });

  Scenario('Inputs that cannot place the manager return nothing', ({ Given, When, Then, And }) => {
    let curve: RankCurve;

    Given('the GW11 curve and a manager on 606 points before the gameweek', () => {
      curve = gw11Curve();
    });

    When('the pre-gameweek total is missing', () => {
      expect(
        computeRankTargets({
          curve,
          gw: 12,
          preGwTotal: 0,
          livePoints: 25,
          fieldLiveAverage: FIELD_AVERAGE,
          preGwRank: 4_362_395,
        })
      ).toBeNull();
    });

    Then('no targets are returned', () => {
      expect(
        computeRankTargets({
          curve,
          gw: 12,
          preGwTotal: 606,
          livePoints: 25,
          fieldLiveAverage: FIELD_AVERAGE,
          preGwRank: 0,
        })
      ).toBeNull();
    });

    And('an empty curve also returns nothing', () => {
      expect(
        computeRankTargets({
          curve: { gw: 11, rankedCount: GW11_RANKED_COUNT, builtAt: '', points: [] },
          gw: 12,
          preGwTotal: 606,
          livePoints: 25,
          fieldLiveAverage: FIELD_AVERAGE,
          preGwRank: 4_362_395,
        })
      ).toBeNull();
    });
  });

  Scenario('A curve from the wrong gameweek is refused, not estimated', ({ Given, When, Then }) => {
    let curve: RankCurve;
    let stale: RankTargets | null;
    let ahead: RankTargets | null;

    Given('the GW11 curve and a manager on 606 points before the gameweek', () => {
      curve = gw11Curve();
    });

    When('the live gameweek is not the one after the curve', () => {
      const base = {
        curve,
        preGwTotal: 606,
        livePoints: 25,
        fieldLiveAverage: FIELD_AVERAGE,
        preGwRank: 4_362_395,
      };
      // GW11's curve is only on the right scale for GW12. Serving it a
      // gameweek late shifts the x-axis by a gameweek of scoring.
      stale = computeRankTargets({ ...base, gw: 13 });
      ahead = computeRankTargets({ ...base, gw: 11 });
    });

    Then('no targets are returned', () => {
      expect(stale).toBeNull();
      expect(ahead).toBeNull();
      // and the matching generation still works, so the guard is not blanket
      expect(
        computeRankTargets({
          curve,
          gw: 12,
          preGwTotal: 606,
          livePoints: 25,
          fieldLiveAverage: FIELD_AVERAGE,
          preGwRank: 4_362_395,
        })
      ).not.toBeNull();
    });
  });

  Scenario('An unreachable milestone is not offered as a target', ({ Given, When, Then, And }) => {
    let curve: RankCurve;
    let deep: RankTargets | null;

    Given('the GW11 curve and a manager deep in the field', () => {
      curve = gw11Curve();
    });

    When('I compute their rank targets', () => {
      // 300 points puts them around 10.7M. Before the reachability guard they
      // were told the top million needed 382 more points in one gameweek.
      deep = computeRankTargets({
        curve,
        gw: 12,
        preGwTotal: 300,
        livePoints: 0,
        fieldLiveAverage: 0,
        preGwRank: 10_700_000,
        maxReachableGwPoints: 106,
      });
    });

    Then('the milestones they cannot reach in a gameweek are flagged', () => {
      expect(deep).not.toBeNull();
      if (deep === null) return;
      const result = deep;
      const aheadOfThem = result.targets.filter((t) => t.rank < result.liveRank);
      expect(aheadOfThem.length).toBeGreaterThan(0);
      for (const target of aheadOfThem) {
        expect(target.reachable).toBe(target.pointsFromHere <= 106);
      }
    });

    And('no next target is offered when none is reachable', () => {
      if (deep === null) return;
      expect(deep.nextTarget).toBeNull();
    });
  });

  Scenario(
    "The reachable bound comes from FPL's own highest score",
    ({ Given, When, Then, And }) => {
      function event(id: number, highest: number | null): FplEvent {
        return {
          id,
          name: `Gameweek ${id}`,
          deadline_time: '2026-11-21T11:00:00Z',
          is_current: false,
          is_next: false,
          is_previous: false,
          average_entry_score: 35,
          highest_score: highest,
          finished: true,
        };
      }
      function bootstrap(events: FplEvent[]): FplBootstrapStatic {
        return { elements: [], teams: [], element_types: [], events };
      }
      let highest = 0;

      Given('a bootstrap whose best gameweek score is 106', () => {
        highest = seasonHighestGwScore(bootstrap([event(10, 98), event(11, 106), event(12, null)]));
      });

      When("I ask for the season's highest gameweek score", () => {
        expect(highest).toBeGreaterThan(0);
      });

      Then('it is 106', () => {
        expect(highest).toBe(106);
      });

      And('a bootstrap with no scores yet falls back to the constant', () => {
        expect(seasonHighestGwScore(bootstrap([event(1, null)]))).toBe(REACHABLE_GW_POINTS);
        expect(seasonHighestGwScore(bootstrap([]))).toBe(REACHABLE_GW_POINTS);
      });
    }
  );
});
