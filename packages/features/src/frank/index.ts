import type { FrankWeeklyPayload } from '@simplyfpl/types';

export type { FrankCandidate, FrankWeeklyPayload } from '@simplyfpl/types';

export function isFrankWeeklyPayload(value: unknown): value is FrankWeeklyPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['gameweek'] === 'number' &&
    typeof v['generatedAt'] === 'string' &&
    Array.isArray(v['captainCandidates']) &&
    Array.isArray(v['transferTargets'])
  );
}
