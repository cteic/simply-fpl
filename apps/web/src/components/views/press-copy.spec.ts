import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { LeaguePress } from '@simplyfpl/fpl-client';

import type { PressPageModel } from './press-copy';
import { buildPressModel, buildPressShareText } from './press-copy';

const feature = await loadFeature('./press-copy.feature');

function makePress(overrides: Partial<LeaguePress> = {}): LeaguePress {
  return {
    leagueName: 'The Gibbingtons',
    memberCount: 5,
    leader: {
      entryId: 1,
      entryName: 'GW King FC',
      playerName: "James O'Brien",
      total: 1000,
      eventTotal: 71,
    },
    chaser: { entryId: 2, entryName: 'Saka Boom', playerName: 'Aoife Murphy', gap: 3 },
    isRivalryWeek: true,
    topScore: { entryId: 2, entryName: 'Saka Boom', playerName: 'Aoife Murphy', eventTotal: 89 },
    sackWatch: {
      entryId: 5,
      entryName: 'Palmer FC',
      playerName: 'Sinéad Byrne',
      eventTotal: 31,
    },
    biggestClimb: null,
    standingsTop: [
      { rank: 1, entryName: 'GW King FC', total: 1000, eventTotal: 71 },
      { rank: 2, entryName: 'Saka Boom', total: 997, eventTotal: 89 },
      { rank: 3, entryName: 'Palmer FC', total: 950, eventTotal: 31 },
    ],
    yourRank: 3,
    ...overrides,
  };
}

let press: LeaguePress;
let model: PressPageModel;
let shareText: string;

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'A close title race leads with the chase and a rivalry story',
    ({ Given, When, Then, And }) => {
      Given('a derived press where the leader is 3 points clear', () => {
        press = makePress();
      });

      When('the press model is built', () => {
        model = buildPressModel(press);
      });

      Then('the lede names the chaser and the gap', () => {
        expect(model.lede).toContain('Saka Boom');
        expect(model.lede).toContain('3');
      });

      And('a rivalry story is included', () => {
        expect(model.stories.map((s) => s.id)).toContain('rivalry');
      });
    }
  );

  Scenario('A comfortable lead has no rivalry story', ({ Given, When, Then }) => {
    Given('a derived press where the leader is 40 points clear', () => {
      press = makePress({
        chaser: { entryId: 2, entryName: 'Saka Boom', playerName: 'Aoife Murphy', gap: 40 },
        isRivalryWeek: false,
      });
    });

    When('the press model is built', () => {
      model = buildPressModel(press);
    });

    Then('no rivalry story is included', () => {
      expect(model.stories.map((s) => s.id)).not.toContain('rivalry');
    });
  });

  Scenario('A missing sack watch produces no sack watch story', ({ Given, When, Then }) => {
    Given('a derived press without a sack watch', () => {
      press = makePress({ sackWatch: null });
    });

    When('the press model is built', () => {
      model = buildPressModel(press);
    });

    Then('no sack watch story is included', () => {
      expect(model.stories.map((s) => s.id)).not.toContain('sack-watch');
    });
  });

  Scenario('The share text carries the top three and the site credit', ({ Given, When, Then }) => {
    Given('a derived press where the leader is 3 points clear', () => {
      press = makePress();
    });

    When('the share text is built for gameweek 16', () => {
      shareText = buildPressShareText(press, 16);
    });

    Then('it contains the review heading, the top-three standings and the site credit', () => {
      expect(shareText).toContain('THE GIBBINGTONS');
      expect(shareText).toContain('GW16');
      expect(shareText).toContain('1. GW King FC — 1000 (GW 71)');
      expect(shareText).toContain('3. Palmer FC — 950 (GW 31)');
      expect(shareText).toContain('via simplyfpl.com');
    });
  });
});
