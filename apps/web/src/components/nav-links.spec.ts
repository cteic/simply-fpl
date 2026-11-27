import { describe, expect, it } from 'vitest';

import { buildLiveLabel, buildNavLinks } from './nav-links';

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

  it('shows Scout only when its flag is on', () => {
    expect(labels({ hasEntry: false, prices: false, planner: false })).not.toContain('Scout');
    expect(labels({ hasEntry: true, prices: true, planner: true, scout: true })).toEqual([
      'Leagues',
      'Prices',
      'Planner',
      'Scout',
      'Deadline',
    ]);
  });
});

describe('buildLiveLabel', () => {
  it('says Live only while the gameweek is in progress', () => {
    expect(buildLiveLabel(11, 'live')).toBe('GW11 Live');
  });

  it('drops Live once the gameweek has settled or before it starts', () => {
    expect(buildLiveLabel(11, 'settled')).toBe('GW11');
    expect(buildLiveLabel(12, 'pre')).toBe('GW12');
    expect(buildLiveLabel(11, null)).toBe('GW11');
  });

  it('falls back to a bare label before the gameweek is known', () => {
    expect(buildLiveLabel(null, null)).toBe('Live');
  });
});
