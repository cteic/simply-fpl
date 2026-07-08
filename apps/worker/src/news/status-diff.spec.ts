import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { FplPlayer } from '@simplyfpl/types';

import {
  type PlayerStatusChange,
  type PlayerStatusSnapshot,
  buildSnapshot,
  detectPlayerStatusChanges,
} from './status-diff';

const feature = await loadFeature('./status-diff.feature');

function makePlayer(overrides: Partial<FplPlayer> = {}): FplPlayer {
  return {
    id: 1,
    web_name: 'Saka',
    first_name: 'Bukayo',
    second_name: 'Saka',
    team: 1,
    element_type: 3,
    now_cost: 90,
    total_points: 0,
    event_points: 0,
    selected_by_percent: '30.0',
    transfers_in_event: 0,
    transfers_out_event: 0,
    chance_of_playing_next_round: 100,
    news: '',
    status: 'a',
    ...overrides,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'First tick with no previous entry produces no changes',
    ({ Given, When, Then, And }) => {
      let prev: PlayerStatusSnapshot;
      let current: FplPlayer[];
      let changes: PlayerStatusChange[];

      Given('a snapshot that does not contain player 42', () => {
        prev = {};
      });

      And('the current bootstrap has player 42 as doubtful', () => {
        current = [
          makePlayer({ id: 42, status: 'd', news: 'Knock', chance_of_playing_next_round: 75 }),
        ];
      });

      When('detectPlayerStatusChanges is called', () => {
        changes = detectPlayerStatusChanges(prev, current);
      });

      Then('no change is emitted for player 42', () => {
        expect(changes).toHaveLength(0);
      });
    }
  );

  Scenario('Newly flagged — player gains news from a clean slate', ({ Given, When, Then, And }) => {
    let prev: PlayerStatusSnapshot;
    let current: FplPlayer[];
    let changes: PlayerStatusChange[];

    Given('a snapshot where player 10 was available (no news, status a)', () => {
      prev = { '10': { status: 'a', news: '', chance: 100 } };
    });

    And('the current bootstrap has player 10 with news "Knock" and status d', () => {
      current = [
        makePlayer({ id: 10, status: 'd', news: 'Knock', chance_of_playing_next_round: 75 }),
      ];
    });

    When('detectPlayerStatusChanges is called', () => {
      changes = detectPlayerStatusChanges(prev, current);
    });

    Then('a newly_flagged change is emitted for player 10', () => {
      expect(changes).toHaveLength(1);
      expect(changes[0]?.changeType).toBe('newly_flagged');
      expect(changes[0]?.playerId).toBe(10);
    });
  });

  Scenario('Ruled out — player moves to unavailable status', ({ Given, When, Then, And }) => {
    let prev: PlayerStatusSnapshot;
    let current: FplPlayer[];
    let changes: PlayerStatusChange[];

    Given('a snapshot where player 20 was doubtful (status d, 50% chance)', () => {
      prev = { '20': { status: 'd', news: 'Knock', chance: 50 } };
    });

    And('the current bootstrap has player 20 with status i (injured, 0% chance)', () => {
      current = [
        makePlayer({ id: 20, status: 'i', news: 'Muscle injury', chance_of_playing_next_round: 0 }),
      ];
    });

    When('detectPlayerStatusChanges is called', () => {
      changes = detectPlayerStatusChanges(prev, current);
    });

    Then('a ruled_out change is emitted for player 20', () => {
      expect(changes).toHaveLength(1);
      expect(changes[0]?.changeType).toBe('ruled_out');
      expect(changes[0]?.playerId).toBe(20);
    });
  });

  Scenario(
    'Upgraded — chance of playing increases while still doubtful',
    ({ Given, When, Then, And }) => {
      let prev: PlayerStatusSnapshot;
      let current: FplPlayer[];
      let changes: PlayerStatusChange[];

      Given('a snapshot where player 30 was doubtful at 25% chance', () => {
        prev = { '30': { status: 'd', news: 'Knock', chance: 25 } };
      });

      And('the current bootstrap has player 30 still doubtful but at 75% chance', () => {
        current = [
          makePlayer({
            id: 30,
            status: 'd',
            news: 'Knock — improving',
            chance_of_playing_next_round: 75,
          }),
        ];
      });

      When('detectPlayerStatusChanges is called', () => {
        changes = detectPlayerStatusChanges(prev, current);
      });

      Then('an upgraded change is emitted for player 30', () => {
        expect(changes).toHaveLength(1);
        expect(changes[0]?.changeType).toBe('upgraded');
        expect(changes[0]?.playerId).toBe(30);
      });

      And('the chanceOfPlaying on the change is 75', () => {
        expect(changes[0]?.chanceOfPlaying).toBe(75);
      });
    }
  );

  Scenario('No change — status unchanged between ticks', ({ Given, When, Then, And }) => {
    let prev: PlayerStatusSnapshot;
    let current: FplPlayer[];
    let changes: PlayerStatusChange[];

    Given('a snapshot where player 40 was doubtful at 50% chance', () => {
      prev = { '40': { status: 'd', news: 'Knock', chance: 50 } };
    });

    And('the current bootstrap has player 40 still doubtful at 50% chance', () => {
      current = [
        makePlayer({ id: 40, status: 'd', news: 'Knock', chance_of_playing_next_round: 50 }),
      ];
    });

    When('detectPlayerStatusChanges is called', () => {
      changes = detectPlayerStatusChanges(prev, current);
    });

    Then('no change is emitted for player 40', () => {
      expect(changes).toHaveLength(0);
    });
  });

  Scenario(
    'Chance decreases while still doubtful — no upgraded change',
    ({ Given, When, Then, And }) => {
      let prev: PlayerStatusSnapshot;
      let current: FplPlayer[];
      let changes: PlayerStatusChange[];

      Given('a snapshot where player 50 was doubtful at 75% chance', () => {
        prev = { '50': { status: 'd', news: 'Knock', chance: 75 } };
      });

      And('the current bootstrap has player 50 still doubtful but at 50% chance', () => {
        current = [
          makePlayer({
            id: 50,
            status: 'd',
            news: 'Knock — concern',
            chance_of_playing_next_round: 50,
          }),
        ];
      });

      When('detectPlayerStatusChanges is called', () => {
        changes = detectPlayerStatusChanges(prev, current);
      });

      Then('no change is emitted for player 50', () => {
        expect(changes).toHaveLength(0);
      });
    }
  );

  Scenario(
    'buildSnapshot captures status, news, and chance for all players',
    ({ Given, When, Then }) => {
      let players: FplPlayer[];
      let snap: PlayerStatusSnapshot;

      Given('a bootstrap with two players: one available and one doubtful', () => {
        players = [
          makePlayer({ id: 1, status: 'a', news: '', chance_of_playing_next_round: 100 }),
          makePlayer({ id: 2, status: 'd', news: 'Knock', chance_of_playing_next_round: 75 }),
        ];
      });

      When('buildSnapshot is called', () => {
        snap = buildSnapshot(players);
      });

      Then('both players appear in the snapshot with their status, news, and chance', () => {
        expect(snap['1']).toEqual({ status: 'a', news: '', chance: 100 });
        expect(snap['2']).toEqual({ status: 'd', news: 'Knock', chance: 75 });
      });
    }
  );
});
