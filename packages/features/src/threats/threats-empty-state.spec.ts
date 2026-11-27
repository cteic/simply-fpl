import { describe, expect, it } from 'vitest';

import { threatsEmptyState } from './threats-empty-state';

const BASE = {
  hasEntry: true,
  resolved: false,
  bootstrapLoaded: true,
  gameweek: 11,
  failed: false,
};

describe('threatsEmptyState', () => {
  it('asks for a team first', () => {
    expect(threatsEmptyState({ ...BASE, hasEntry: false })).toBe('no_team');
  });

  it('is loading while requests are still on their way', () => {
    expect(threatsEmptyState(BASE)).toBe('loading');
    expect(threatsEmptyState({ ...BASE, bootstrapLoaded: false, gameweek: null })).toBe('loading');
  });

  it('is unavailable, not loading, when a required request failed', () => {
    expect(threatsEmptyState({ ...BASE, failed: true })).toBe('unavailable');
  });

  it('is unavailable when the bootstrap names no current gameweek', () => {
    expect(threatsEmptyState({ ...BASE, gameweek: null })).toBe('unavailable');
  });

  it('reports no match once the list is computed and the filter empties it', () => {
    expect(threatsEmptyState({ ...BASE, resolved: true })).toBe('no_match');
  });
});
