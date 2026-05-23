import { describe, expect, it } from 'vitest';

import { resolveHomeChoice } from './home-choice';

describe('resolveHomeChoice', () => {
  it('deselects (clears storage) and shows search on ?clear=1', () => {
    expect(resolveHomeChoice({ clear: true, forceForm: false, savedId: 219895 })).toEqual({
      choice: 'search',
      clearStorage: true,
    });
  });

  it('clear takes precedence over a saved team', () => {
    expect(resolveHomeChoice({ clear: true, forceForm: true, savedId: 219895 }).clearStorage).toBe(
      true
    );
  });

  it('shows search without clearing on ?change=1', () => {
    expect(resolveHomeChoice({ clear: false, forceForm: true, savedId: 219895 })).toEqual({
      choice: 'search',
      clearStorage: false,
    });
  });

  it('shows the saved team dashboard when one is set', () => {
    expect(resolveHomeChoice({ clear: false, forceForm: false, savedId: 219895 })).toEqual({
      choice: { entryId: 219895 },
      clearStorage: false,
    });
  });

  it('shows search when no team is saved', () => {
    expect(resolveHomeChoice({ clear: false, forceForm: false, savedId: null })).toEqual({
      choice: 'search',
      clearStorage: false,
    });
  });
});
