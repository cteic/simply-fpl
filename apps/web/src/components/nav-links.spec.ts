import { describe, expect, it } from 'vitest';

import { buildNavLinks } from './nav-links';

function labels(opts: Parameters<typeof buildNavLinks>[0]): string[] {
  return buildNavLinks(opts).map((l) => l.label);
}

describe('buildNavLinks', () => {
  it('hides Leagues when no team is selected', () => {
    expect(labels({ hasEntry: false, prices: false, planner: false })).not.toContain('Leagues');
  });

  it('shows Leagues once a team is selected', () => {
    const links = buildNavLinks({ hasEntry: true, prices: false, planner: false });
    expect(links).toEqual([{ label: 'Leagues', href: '/leagues' }]);
  });

  it('includes flagged links and keeps Leagues gated on the entry', () => {
    expect(labels({ hasEntry: false, prices: true, planner: true })).toEqual(['Prices', 'Planner']);
    expect(labels({ hasEntry: true, prices: true, planner: true })).toEqual([
      'Leagues',
      'Prices',
      'Planner',
    ]);
  });
});
