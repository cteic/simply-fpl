import type {
  FplBootstrapStatic,
  FplEvent,
  FplLiveGameweek,
  ScoreDistribution,
} from '@simplyfpl/types';

export type FieldAverageSource = 'fpl-published' | 'live-cohort' | 'ownership-weighted' | 'unknown';

export interface FieldLiveAverage {
  average: number;
  source: FieldAverageSource;
}

/**
 * Ownership-weighted points summed over whole 15-man squads overstate what the
 * average entry actually scores, because only 11 players count and transfer
 * hits come off. Calibrated against GW11 2026/27: the weighted sum came to
 * 42.59 against FPL's published average of 35.
 */
export const OWNERSHIP_WEIGHT_CALIBRATION = 0.82;

/**
 * Approximate the field's average gameweek score from live element points
 * weighted by ownership.
 *
 * This is the fallback for when FPL has not published `average_entry_score`
 * and no cohort sample is available. It is the least accurate of the three
 * sources, but it is derived from data the live view already holds, so it
 * costs no extra request.
 *
 * Returns null when the inputs cannot support an estimate.
 */
export function estimateFieldAverageFromOwnership(
  liveGw: FplLiveGameweek,
  bootstrap: FplBootstrapStatic
): number | null {
  if (!Array.isArray(liveGw.elements) || !Array.isArray(bootstrap.elements)) return null;
  if (liveGw.elements.length === 0 || bootstrap.elements.length === 0) return null;

  const ownershipById = new Map<number, number>();
  for (const player of bootstrap.elements) {
    const ownership = Number.parseFloat(player.selected_by_percent);
    if (Number.isFinite(ownership)) ownershipById.set(player.id, ownership);
  }
  if (ownershipById.size === 0) return null;

  let weighted = 0;
  for (const element of liveGw.elements) {
    const ownership = ownershipById.get(element.id);
    if (ownership === undefined) continue;
    weighted += (element.stats.total_points * ownership) / 100;
  }

  if (weighted <= 0) return null;
  return weighted * OWNERSHIP_WEIGHT_CALIBRATION;
}

export interface ResolveFieldLiveAverageInput {
  event?: FplEvent | undefined;
  liveGw?: FplLiveGameweek | undefined;
  bootstrap?: FplBootstrapStatic | undefined;
  liveAggregate?: ScoreDistribution | undefined;
}

/**
 * The field's average score so far this gameweek, from the best source
 * available.
 *
 * Priority:
 *   1. fpl-published — `event.average_entry_score` once it is above zero. It
 *      covers the whole field, so nothing beats it. FPL reports 0 for a
 *      gameweek that has not started.
 *   2. live-cohort — the mean of a sampled score distribution.
 *   3. ownership-weighted — derived from live element points and ownership.
 *
 * Every live-rank estimate is a comparison against this number, so when it is
 * wrong the rank is wrong by roughly its error times the local slope of the
 * curve. Callers should treat `unknown` as "cannot estimate", not as zero: an
 * average of zero claims the whole field has scored nothing, which inflates
 * every manager's apparent gain by their entire score.
 */
export function resolveFieldLiveAverage(input: ResolveFieldLiveAverageInput): FieldLiveAverage {
  const published = input.event?.average_entry_score;
  if (typeof published === 'number' && published > 0) {
    return { average: published, source: 'fpl-published' };
  }

  const cohortMean = input.liveAggregate?.mean;
  if (typeof cohortMean === 'number' && cohortMean > 0) {
    return { average: cohortMean, source: 'live-cohort' };
  }

  if (input.liveGw && input.bootstrap) {
    const weighted = estimateFieldAverageFromOwnership(input.liveGw, input.bootstrap);
    if (weighted !== null && weighted > 0) {
      return { average: weighted, source: 'ownership-weighted' };
    }
  }

  return { average: 0, source: 'unknown' };
}
