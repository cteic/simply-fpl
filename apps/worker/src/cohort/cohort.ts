import type { FplBootstrapStatic, FplEvent } from '@simplyfpl/types';

import type { CohortTier } from './aggregate';
import { type FetchTierEnv, TIER_CONFIGS, readAggregate, resumeCohortFetch } from './fetch-tier';
import { type FlushEnv, flushToSupabase } from './flush';

export type CohortMode = 'live' | 'idle' | 'off';

export interface CohortEnv extends FetchTierEnv, FlushEnv {}

export function pickCronMode(now: Date, events: FplEvent[]): CohortMode {
  const current = events.find((e) => e.is_current);
  if (!current) return 'off';
  if (current.finished) return 'idle';

  const deadline = new Date(current.deadline_time).getTime();
  const fortyEightHoursLater = deadline + 48 * 60 * 60 * 1000;
  if (now.getTime() < deadline) return 'idle';
  if (now.getTime() < fortyEightHoursLater) return 'live';
  return 'idle';
}

async function fetchBootstrap(env: FetchTierEnv): Promise<FplBootstrapStatic | null> {
  const cached = await env.FPL_CACHE.get('fpl:/bootstrap-static/', 'text');
  if (!cached) return null;
  try {
    return JSON.parse(cached) as FplBootstrapStatic;
  } catch {
    return null;
  }
}

function tiersForMode(mode: CohortMode): CohortTier[] {
  if (mode === 'off') return [];
  if (mode === 'live') return ['legendary', 'top_10k', 'overall'];
  return ['legendary', 'top_10k', 'top_100k'];
}

export async function runScheduled(
  scheduledTime: number,
  env: CohortEnv,
  _ctx: ExecutionContext
): Promise<void> {
  const bootstrap = await fetchBootstrap(env);
  if (!bootstrap) return;

  const mode = pickCronMode(new Date(scheduledTime), bootstrap.events);
  if (mode === 'off') return;

  const currentEvent = bootstrap.events.find((e) => e.is_current);
  if (!currentEvent) return;
  const gw = currentEvent.id;

  for (const tierSlug of tiersForMode(mode)) {
    const tierConfig = TIER_CONFIGS[tierSlug];
    const result = await resumeCohortFetch(env, gw, tierConfig);
    if (result.paused) break;

    if (result.fetched > 0) {
      const agg = await readAggregate(env, gw, tierSlug);
      await flushToSupabase(env, gw, tierSlug, agg, result.done);
    }
  }
}
