import { describe, expect, it } from 'vitest';

import { SAVED_ENTRY_ID_KEY } from '@/lib/saved-entry-key';

import { SAVED_ENTRY_HINT_ATTRIBUTE, SAVED_ENTRY_HINT_SCRIPT } from './saved-entry-hint';

function runHint(search: string, stored: string | null): boolean {
  const attributes = new Set<string>();
  const store = new Map<string, string>();
  if (stored !== null) store.set(SAVED_ENTRY_ID_KEY, stored);
  const run = new Function('location', 'localStorage', 'document', SAVED_ENTRY_HINT_SCRIPT);
  run(
    { search },
    { getItem: (key: string) => store.get(key) ?? null },
    { documentElement: { setAttribute: (name: string) => attributes.add(name) } }
  );
  return attributes.has(SAVED_ENTRY_HINT_ATTRIBUTE);
}

describe('saved-entry hint script', () => {
  it('marks the page when a valid team is saved', () => {
    expect(runHint('', '219895')).toBe(true);
  });

  it('leaves first-time visitors alone so the hero paints', () => {
    expect(runHint('', null)).toBe(false);
  });

  it('ignores a saved value that is not a positive integer', () => {
    expect(runHint('', 'abc')).toBe(false);
    expect(runHint('', '-4')).toBe(false);
  });

  it('shows the hero when the URL asks to change or clear the team', () => {
    expect(runHint('?change=1', '219895')).toBe(false);
    expect(runHint('?clear=1', '219895')).toBe(false);
  });

  it('does not throw when storage is unavailable', () => {
    const run = new Function('location', 'localStorage', 'document', SAVED_ENTRY_HINT_SCRIPT);
    expect(() =>
      run(
        { search: '' },
        {
          getItem: () => {
            throw new Error('denied');
          },
        },
        {}
      )
    ).not.toThrow();
  });
});
