export interface NavLinkItem {
  label: string;
  href: string;
}

export interface NavLinkOptions {
  hasEntry: boolean;
  prices: boolean;
  planner: boolean;
}

/**
 * Builds the primary nav links. Leagues lives on its own /leagues route but
 * is only useful once a team is selected, so it is hidden until then.
 */
export function buildNavLinks({ hasEntry, prices, planner }: NavLinkOptions): NavLinkItem[] {
  const links: NavLinkItem[] = [];
  if (hasEntry) links.push({ label: 'Leagues', href: '/leagues' });
  if (prices) links.push({ label: 'Prices', href: '/prices' });
  if (planner) links.push({ label: 'Planner', href: '/planner' });
  return links;
}
