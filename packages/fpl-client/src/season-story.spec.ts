import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplEntryHistory, FplEntryHistoryRow, SeasonStory } from '@simplyfpl/types';

import { buildSeasonStory, seasonSparklinePoints } from './season-story';

const feature = await loadFeature('./season-story.feature');

function row(
  event: number,
  points: number,
  overallRank: number,
  gwRank: number,
  bench: number
): FplEntryHistoryRow {
  return {
    event,
    points,
    total_points: 0,
    rank: gwRank,
    rank_sort: gwRank,
    overall_rank: overallRank,
    event_transfers: 0,
    event_transfers_cost: event === 5 ? 4 : 0,
    points_on_bench: bench,
  };
}

function history(current: FplEntryHistoryRow[]): FplEntryHistory {
  return { current, past: [], chips: [] };
}

/** Entry 219895, gameweeks 1 to 11 of 2026/27, as FPL reports them. */
function realSeason(): FplEntryHistory {
  return history([
    row(1, 61, 1_605_173, 1_605_175, 0),
    row(2, 91, 1_769_269, 2_885_921, 18),
    row(3, 46, 2_523_055, 7_165_954, 12),
    row(4, 75, 2_513_299, 3_829_537, 17),
    row(5, 36, 3_623_234, 9_176_671, 18),
    row(6, 62, 3_553_831, 4_495_537, 6),
    row(7, 51, 4_283_596, 8_006_650, 13),
    row(8, 41, 4_614_421, 7_236_422, 6),
    row(9, 40, 5_045_564, 8_058_245, 32),
    row(10, 78, 3_797_347, 390_895, 11),
    row(11, 25, 4_362_395, 9_743_212, 19),
  ]);
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'Arrows follow the overall rank from one gameweek to the next',
    ({ Given, When, Then, And }) => {
      let story: SeasonStory;

      Given('a real eleven-gameweek season', () => {
        story = buildSeasonStory(realSeason());
      });

      When('I build the season story', () => {
        expect(story.trajectory).toHaveLength(11);
      });

      Then('the first gameweek has no arrow', () => {
        expect(story.trajectory[0]?.arrow).toBe('flat');
      });

      And('a better rank than the week before is a green arrow', () => {
        // GW10: 5,045,564 -> 3,797,347
        expect(story.trajectory[9]?.arrow).toBe('green');
      });

      And('a worse rank than the week before is a red arrow', () => {
        // GW11: 3,797,347 -> 4,362,395
        expect(story.trajectory[10]?.arrow).toBe('red');
      });

      And('the arrow totals match the season', () => {
        // green: GW4, GW6, GW10. red: GW2, 3, 5, 7, 8, 9, 11.
        expect(story.greenArrows).toBe(3);
        expect(story.redArrows).toBe(7);
      });
    }
  );

  Scenario('Records are picked out of the season', ({ Given, When, Then, And }) => {
    let story: SeasonStory;

    Given('a real eleven-gameweek season', () => {
      story = buildSeasonStory(realSeason());
    });

    When('I build the season story', () => {
      expect(story.trajectory.length).toBeGreaterThan(0);
    });

    Then('the best rank is the lowest overall rank and its gameweek', () => {
      expect(story.bestRank).toEqual({ gw: 1, rank: 1_605_173 });
    });

    And('the best gameweek is the highest score', () => {
      expect(story.bestGameweek).toEqual({ gw: 2, points: 91, gwRank: 2_885_921 });
    });

    And('bench points and transfer hits are totalled', () => {
      expect(story.benchPoints).toBe(152);
      expect(story.hitPoints).toBe(4);
    });
  });

  Scenario('The streak counts back from the latest gameweek', ({ Given, When, Then }) => {
    let story: SeasonStory;

    Given('a season that ends on three green arrows', () => {
      story = buildSeasonStory(
        history([
          row(1, 50, 900_000, 1, 0),
          row(2, 40, 1_200_000, 1, 0),
          row(3, 60, 1_000_000, 1, 0),
          row(4, 60, 800_000, 1, 0),
          row(6, 60, 600_000, 1, 0),
        ])
      );
    });

    When('I build the season story', () => {
      expect(story.trajectory).toHaveLength(5);
    });

    Then('the streak is three green', () => {
      expect(story.streak).toEqual({ direction: 'green', length: 3 });
    });
  });

  Scenario('A manager with no ranked gameweeks has an empty story', ({ Given, When, Then }) => {
    let story: SeasonStory;

    Given('a history with no ranked gameweeks', () => {
      story = buildSeasonStory(history([row(1, 0, 0, 0, 0)]));
    });

    When('I build the season story', () => {
      expect(story).toBeDefined();
    });

    Then('the trajectory is empty and nothing is invented', () => {
      expect(story.trajectory).toHaveLength(0);
      expect(story.bestRank).toBeNull();
      expect(story.bestGameweek).toBeNull();
      expect(story.streak).toEqual({ direction: 'none', length: 0 });
      expect(seasonSparklinePoints(story.trajectory, { width: 400, height: 40 })).toBeNull();
    });
  });

  Scenario(
    'The sparkline plots the real trajectory with the best rank on top',
    ({ Given, When, Then, And }) => {
      let story: SeasonStory;
      let ys: number[];

      Given('a real eleven-gameweek season', () => {
        story = buildSeasonStory(realSeason());
      });

      When('I build the sparkline points', () => {
        const points = seasonSparklinePoints(story.trajectory, { width: 400, height: 40 });
        expect(points).not.toBeNull();
        ys = (points ?? '').split(' ').map((pair) => Number(pair.split(',')[1]));
      });

      Then('there is one point per gameweek', () => {
        expect(ys).toHaveLength(11);
      });

      And('the best rank sits highest and the worst lowest', () => {
        // SVG y grows downward, so the best rank has the smallest y.
        expect(ys[0]).toBe(Math.min(...ys));
        expect(ys[8]).toBe(Math.max(...ys));
      });

      And('a single gameweek yields no line at all', () => {
        const one = buildSeasonStory(history([row(1, 61, 1_605_173, 1, 0)]));
        expect(seasonSparklinePoints(one.trajectory, { width: 400, height: 40 })).toBeNull();
      });
    }
  );
});
