import type { GameweekPhase } from '@simplyfpl/types';

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface NavLinkOptions {
  hasEntry: boolean;
  prices: boolean;
  planner: boolean;
  scout?: boolean;
}

/**
 * Builds the primary nav links. Leagues lives on its own /leagues route but
 * is only useful once a team is selected, so it is hidden until then.
 */
export function buildNavLinks({
  hasEntry,
  prices,
  planner,
  scout = false,
}: NavLinkOptions): NavLinkItem[] {
  const links: NavLinkItem[] = [];
  if (hasEntry) links.push({ label: 'Leagues', href: '/leagues' });
  if (prices) links.push({ label: 'Prices', href: '/prices' });
  if (planner) links.push({ label: 'Planner', href: '/planner' });
  if (scout) {
    links.push({ label: 'Scout', href: '/scout' });
    links.push({ label: 'Deadline', href: '/deadline' });
  }
  return links;
}

/**
 * Label for the status pill. "Live" only while the gameweek is in progress: an
 * event stays current until the next deadline, so a gameweek that finished
 * days ago must read as plain "GW11", not "GW11 Live".
 */
export function buildLiveLabel(gameweek: number | null, phase: GameweekPhase | null): string {
  if (gameweek === null) return 'Live';
  return phase === 'live' ? `GW${gameweek} Live` : `GW${gameweek}`;
}
