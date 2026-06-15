import type { FplBootstrapStatic, FplEntryGameweekPicks, FplLiveGameweek } from '@simplyfpl/types';

import type { BonusPrediction } from './bonus-points';
import { calculateLivePoints, estimateLiveRank } from './live-rank';

export type WhatIfSwapType = 'captain' | 'transfer';

export interface WhatIfSwap {
  type: WhatIfSwapType;
  from: number;
  to: number;
}

export interface WhatIfResult {
  newLivePoints: number;
  deltaPoints: number;
  newEstimatedRank: number;
  deltaRank: number;
  rankPercentile: number;
}

const APPROX_TOTAL_ENTRIES = 10_000_000;

function clonePicks(picks: FplEntryGameweekPicks): FplEntryGameweekPicks {
  return { ...picks, picks: picks.picks.map((p) => ({ ...p })) };
}

function applyCaptainSwap(
  picks: FplEntryGameweekPicks,
  fromId: number,
  toId: number
): FplEntryGameweekPicks | null {
  if (fromId === toId) return null;
  const isTripleCaptain = picks.active_chip === '3xc';
  const captainMultiplier = isTripleCaptain ? 3 : 2;
  const cloned = clonePicks(picks);
  const activePicks = cloned.picks.filter((p) => p.position <= 11);
  const fromPick = activePicks.find((p) => p.element === fromId);
  const toPick = activePicks.find((p) => p.element === toId);
  if (!fromPick || !toPick) return null;
  fromPick.is_captain = false;
  fromPick.multiplier = 1;
  toPick.is_captain = true;
  toPick.multiplier = captainMultiplier;
  return cloned;
}

function applyTransferSwap(
  picks: FplEntryGameweekPicks,
  fromId: number,
  toId: number
): FplEntryGameweekPicks | null {
  if (fromId === toId) return null;
  const isTripleCaptain = picks.active_chip === '3xc';
  const captainMultiplier = isTripleCaptain ? 3 : 2;
  const cloned = clonePicks(picks);
  const targetPick = cloned.picks.find((p) => p.element === fromId && p.position <= 11);
  if (!targetPick) return null;
  const wasCaptain = targetPick.is_captain;
  targetPick.element = toId;
  if (wasCaptain) {
    targetPick.is_captain = true;
    targetPick.multiplier = captainMultiplier;
  }
  return cloned;
}

export function simulateWhatIf(
  picks: FplEntryGameweekPicks,
  liveGw: FplLiveGameweek,
  bootstrap: FplBootstrapStatic,
  swap: WhatIfSwap,
  preGwRank: number,
  avgEntryScore: number,
  currentLivePoints: number,
  bonusMap?: Map<number, BonusPrediction>
): WhatIfResult | null {
  const modifiedPicks =
    swap.type === 'captain'
      ? applyCaptainSwap(picks, swap.from, swap.to)
      : applyTransferSwap(picks, swap.from, swap.to);

  if (!modifiedPicks) return null;

  const newLivePoints = calculateLivePoints(modifiedPicks, liveGw, bootstrap, bonusMap);
  const deltaPoints = newLivePoints - currentLivePoints;

  const newRankEstimate = estimateLiveRank(preGwRank, newLivePoints, avgEntryScore);
  const currentRankEstimate = estimateLiveRank(preGwRank, currentLivePoints, avgEntryScore);
  const newEstimatedRank = newRankEstimate.liveRank;
  const deltaRank = currentRankEstimate.liveRank - newEstimatedRank;
  const rankPercentile = Math.max(
    0,
    Math.min(100, (1 - newEstimatedRank / APPROX_TOTAL_ENTRIES) * 100)
  );

  return { newLivePoints, deltaPoints, newEstimatedRank, deltaRank, rankPercentile };
}
