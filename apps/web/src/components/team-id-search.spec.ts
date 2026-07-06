import { describe, expect, it } from 'vitest';

import { lookupEntry, parseEntryId } from './team-id-search';

describe('parseEntryId', () => {
  it('accepts a plain numeric ID', () => {
    expect(parseEntryId('219895')).toBe(219895);
    expect(parseEntryId('  219895 ')).toBe(219895);
  });

  it('extracts the ID from a pasted FPL URL', () => {
    expect(parseEntryId('https://fantasy.premierleague.com/entry/219895/event/37')).toBe(219895);
    expect(parseEntryId('fantasy.premierleague.com/entry/4173513/')).toBe(4173513);
  });

  it('rejects empty, non-numeric, or non-positive input', () => {
    expect(parseEntryId('')).toBeNull();
    expect(parseEntryId('not a team')).toBeNull();
    expect(parseEntryId('0')).toBeNull();
    expect(parseEntryId('-5')).toBeNull();
  });
});

describe('lookupEntry', () => {
  it('returns found when the entry resolves', async () => {
    const result = await lookupEntry(219895, async () => ({ id: 219895 }));
    expect(result.status).toBe('found');
  });

  it('maps a 404 from the FPL proxy to not-found', async () => {
    const getEntry = async () => {
      throw new Error('FPL API error: 404 Not Found — /fpl/entry/999999999/');
    };
    const result = await lookupEntry(999999999, getEntry);
    expect(result.status).toBe('not-found');
  });

  it('treats other failures as a transient error', async () => {
    const getEntry = async () => {
      throw new Error('Failed to fetch');
    };
    const result = await lookupEntry(219895, getEntry);
    expect(result.status).toBe('error');
  });
});
