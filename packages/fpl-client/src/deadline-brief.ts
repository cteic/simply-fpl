import type { FplBootstrapStatic, PriceChange, ScoutEvent } from '@simplyfpl/types';

import { predictPriceChanges } from './price-changes';
import type { DeriveScoutEventsOptions } from './scout-events';
import { deriveScoutEvents } from './scout-events';

export interface DeadlineBrief {
  openIssues: ScoutEvent[];
  goodNews: ScoutEvent[];
  risesTonight: number;
  fallsTonight: number;
}

/** Threshold progress at which FPL moves a price. */
const CHANGE_DUE_PERCENT = 100;

/**
 * Whether this player's price moves tonight.
 *
 * FPL projects each player's threshold progress to the end of today, so a
 * projection at or past 100 is a change due tonight rather than a guess. A
 * locked player cannot move again whatever their progress reads.
 */
function changesTonight(change: PriceChange): boolean {
  if (change.lockedUntil !== null) return false;
  return Math.abs(change.projectedPercent) >= CHANGE_DUE_PERCENT;
}

/**
 * Everything a manager should resolve before the deadline: their own squad's
 * scout events split into problems and good news, plus the game-wide count of
 * likely price moves tonight.
 */
export function buildDeadlineBrief(
  bootstrap: FplBootstrapStatic,
  pickIds: ReadonlySet<number>,
  options: DeriveScoutEventsOptions = {}
): DeadlineBrief {
  const events = deriveScoutEvents(bootstrap, pickIds, options);

  let risesTonight = 0;
  let fallsTonight = 0;
  for (const change of predictPriceChanges(bootstrap)) {
    if (!changesTonight(change)) continue;
    if (change.direction === 'rise') risesTonight += 1;
    if (change.direction === 'fall') fallsTonight += 1;
  }

  return {
    openIssues: events.filter((e) => e.severity !== 'good'),
    goodNews: events.filter((e) => e.severity === 'good'),
    risesTonight,
    fallsTonight,
  };
}
