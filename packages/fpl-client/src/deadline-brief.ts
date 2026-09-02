import type { FplBootstrapStatic, ScoutEvent } from '@simplyfpl/types';

import { predictPriceChanges } from './price-changes';
import type { DeriveScoutEventsOptions } from './scout-events';
import { deriveScoutEvents } from './scout-events';

const DEFAULT_PRICE_PROBABILITY_THRESHOLD = 0.5;

export interface DeadlineBrief {
  openIssues: ScoutEvent[];
  goodNews: ScoutEvent[];
  risesTonight: number;
  fallsTonight: number;
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
  const threshold = options.priceProbabilityThreshold ?? DEFAULT_PRICE_PROBABILITY_THRESHOLD;
  const events = deriveScoutEvents(bootstrap, pickIds, options);

  let risesTonight = 0;
  let fallsTonight = 0;
  for (const change of predictPriceChanges(bootstrap)) {
    if (change.probability < threshold) continue;
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
