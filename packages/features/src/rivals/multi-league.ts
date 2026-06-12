import type { TrackedLeague } from '../leagues';

export function getPrimaryLeague(leagues: TrackedLeague[]): TrackedLeague | null {
  return leagues[0] ?? null;
}

export function getVisibleLeagues(leagues: TrackedLeague[], isPro: boolean): TrackedLeague[] {
  if (isPro) return leagues;
  const primary = getPrimaryLeague(leagues);
  if (primary === null) return [];
  return [primary];
}
