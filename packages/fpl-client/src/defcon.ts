import type { DefConProgress } from '@simplyfpl/types';

const ELEMENT_TYPE_DEF = 2;
const ELEMENT_TYPE_MID = 3;

const DEF_CBIT_THRESHOLD = 10;
const MID_CBIT_THRESHOLD = 12;

export function computeDefConProgress(
  elementType: number,
  stats: { clearances_blocks_interceptions: number; tackles: number }
): DefConProgress {
  const eligible = elementType === ELEMENT_TYPE_DEF || elementType === ELEMENT_TYPE_MID;
  if (!eligible) {
    return {
      eligible: false,
      current: 0,
      threshold: 0,
      percentage: 0,
      awarded: false,
      cbi: 0,
      tackles: 0,
    };
  }
  const threshold = elementType === ELEMENT_TYPE_DEF ? DEF_CBIT_THRESHOLD : MID_CBIT_THRESHOLD;
  const cbi = stats.clearances_blocks_interceptions;
  const tackles = stats.tackles;
  const current = cbi + tackles;
  const awarded = current >= threshold;
  const percentage = Math.min(100, (current / threshold) * 100);
  return { eligible: true, current, threshold, percentage, awarded, cbi, tackles };
}

export interface SeasonDefConRate {
  eligible: boolean;
  cbitPer90: number;
  threshold: number;
  percentage: number;
}

export function computeSeasonDefConRate(
  elementType: number,
  player: { clearances_blocks_interceptions?: number; tackles?: number; minutes?: number }
): SeasonDefConRate {
  const eligible = elementType === ELEMENT_TYPE_DEF || elementType === ELEMENT_TYPE_MID;
  if (!eligible || !player.minutes || player.minutes === 0) {
    return { eligible: false, cbitPer90: 0, threshold: 0, percentage: 0 };
  }
  const threshold = elementType === ELEMENT_TYPE_DEF ? DEF_CBIT_THRESHOLD : MID_CBIT_THRESHOLD;
  const cbitTotal = (player.clearances_blocks_interceptions ?? 0) + (player.tackles ?? 0);
  const cbitPer90 = (cbitTotal / player.minutes) * 90;
  const percentage = Math.min(100, (cbitPer90 / threshold) * 100);
  return { eligible: true, cbitPer90, threshold, percentage };
}
