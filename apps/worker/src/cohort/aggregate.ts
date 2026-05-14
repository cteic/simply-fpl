import type { FplEntryGameweekPicks, FplLiveGameweek } from '@simplyfpl/types';

import type { CohortSnapshot } from './types';

export function aggregateCohort(
  cohortName: CohortSnapshot['cohortName'],
  gameweek: number,
  entryPicks: Array<{ entryId: number; picks: FplEntryGameweekPicks }>,
  liveGw: FplLiveGameweek,
  playerCosts?: ReadonlyMap<number, number>
): CohortSnapshot {
  const sampleSize = entryPicks.length;

  if (sampleSize === 0) {
    return {
      cohortName,
      gameweek,
      capturedAt: new Date().toISOString(),
      sampleSize: 0,
      averageScore: 0,
      averagePlayersPlayed: 0,
      averageBudgetUsed: 0,
      averageCaptainPoints: 0,
      playerOwnership: {},
      captainOwnership: {},
      topThreshold: 0,
    };
  }

  const livePointsById = new Map<number, number>(
    liveGw.elements.map((el) => [el.id, el.stats.total_points])
  );
  const liveMinutesById = new Map<number, number>(
    liveGw.elements.map((el) => [el.id, el.stats.minutes])
  );

  const playerOwnerCount = new Map<number, number>();
  const captainOwnerCount = new Map<number, number>();

  let totalScore = 0;
  let totalPlayersPlayed = 0;
  let totalBudgetUsed = 0;
  let totalCaptainPoints = 0;

  for (const { picks: entryGwPicks } of entryPicks) {
    const { picks } = entryGwPicks;

    let entryScore = 0;
    let entryPlayersPlayed = 0;
    let entryBudget = 0;
    let entryCaptainPoints = 0;

    for (const pick of picks) {
      const livePoints = livePointsById.get(pick.element) ?? 0;
      const minutes = liveMinutesById.get(pick.element) ?? 0;

      playerOwnerCount.set(pick.element, (playerOwnerCount.get(pick.element) ?? 0) + 1);

      if (pick.is_captain) {
        captainOwnerCount.set(pick.element, (captainOwnerCount.get(pick.element) ?? 0) + 1);
        entryCaptainPoints = livePoints * pick.multiplier;
      }

      if (pick.multiplier > 0) {
        entryScore += livePoints * pick.multiplier;
        if (minutes > 0) entryPlayersPlayed++;
      }

      if (playerCosts !== undefined) {
        entryBudget += playerCosts.get(pick.element) ?? 0;
      }
    }

    totalScore += entryScore;
    totalPlayersPlayed += entryPlayersPlayed;
    totalBudgetUsed += entryBudget;
    totalCaptainPoints += entryCaptainPoints;
  }

  const playerOwnership: Record<number, number> = {};
  for (const [id, count] of playerOwnerCount) {
    playerOwnership[id] = (count / sampleSize) * 100;
  }

  const captainOwnership: Record<number, number> = {};
  for (const [id, count] of captainOwnerCount) {
    captainOwnership[id] = (count / sampleSize) * 100;
  }

  const lastEntry = entryPicks[entryPicks.length - 1];
  const topThreshold = lastEntry?.picks.entry_history.points ?? 0;

  return {
    cohortName,
    gameweek,
    capturedAt: new Date().toISOString(),
    sampleSize,
    averageScore: totalScore / sampleSize,
    averagePlayersPlayed: totalPlayersPlayed / sampleSize,
    averageBudgetUsed: playerCosts !== undefined ? totalBudgetUsed / sampleSize : 0,
    averageCaptainPoints: totalCaptainPoints / sampleSize,
    playerOwnership,
    captainOwnership,
    topThreshold,
  };
}
