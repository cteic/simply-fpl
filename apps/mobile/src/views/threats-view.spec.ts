import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { filterThreatsByStatus } from '@simplyfpl/features/threats';
import type { Threat } from '@simplyfpl/features/threats';

const feature = await loadFeature('apps/mobile/src/views/threats-view.feature');

function makeThreat(
  elementId: number,
  playingStatus: Threat['playingStatus'],
  effectiveOwnershipPct = 50
): Threat {
  return {
    elementId,
    name: `Player ${elementId}`,
    teamShort: 'TST',
    teamCode: 1,
    position: 'mid',
    ownedByCount: 10,
    ownedByPct: 10,
    captainPct: 5,
    effectiveOwnershipPct,
    livePoints: 4,
    minutes: 90,
    liveRankImpactIfTheyHaul: 1.0,
    pointsLostToThreat: 0.5,
    scorePct: 20,
    playingStatus,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Status filter narrows the threats list', ({ Given, When, Then }) => {
    let threats: Threat[] = [];
    let visible: Threat[] = [];

    Given('threats with playing statuses "played", "playing", and "to-play"', () => {
      threats = [makeThreat(1, 'played'), makeThreat(2, 'playing'), makeThreat(3, 'to-play')];
    });

    When('the status filter is set to "played"', () => {
      visible = filterThreatsByStatus(threats, 'played');
    });

    Then('only the threat with status "played" is visible', () => {
      expect(visible).toHaveLength(1);
      expect(visible[0]?.elementId).toBe(1);
    });
  });

  Scenario('All filter shows every threat', ({ Given, When, Then }) => {
    let threats: Threat[] = [];
    let visible: Threat[] = [];

    Given('threats with playing statuses "played" and "playing"', () => {
      threats = [makeThreat(1, 'played'), makeThreat(2, 'playing')];
    });

    When('the status filter is set to "all"', () => {
      visible = filterThreatsByStatus(threats, 'all');
    });

    Then('both threats are visible', () => {
      expect(visible).toHaveLength(2);
    });
  });

  Scenario('Empty result when no threats match the active filter', ({ Given, When, Then }) => {
    let threats: Threat[] = [];
    let visible: Threat[] = [];

    Given('threats with playing status "played"', () => {
      threats = [makeThreat(1, 'played')];
    });

    When('the status filter is set to "playing"', () => {
      visible = filterThreatsByStatus(threats, 'playing');
    });

    Then('the visible threats list is empty', () => {
      expect(visible).toHaveLength(0);
    });
  });
});
