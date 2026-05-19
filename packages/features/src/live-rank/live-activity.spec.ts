import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('live-activity sessionStorage persistence', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('writes to sessionStorage when setLiveRankEstimate is called', async () => {
    vi.resetModules();
    const mod = await import('./live-activity');
    mod.setLiveRankEstimate({ liveRank: 12345, movement: -50, direction: 'down' });
    const raw = store['simplyfpl:lastLiveRank'];
    expect(raw).toBeDefined();
    if (raw === undefined) return;
    expect(JSON.parse(raw)).toEqual({ liveRank: 12345, movement: -50, direction: 'down' });
  });

  it('hydrates initial state from sessionStorage on module load', async () => {
    store['simplyfpl:lastLiveRank'] = JSON.stringify({
      liveRank: 7777,
      movement: 100,
      direction: 'up',
    });
    vi.resetModules();
    const mod = await import('./live-activity');
    expect(mod.getLiveRankEstimate()).toEqual({
      liveRank: 7777,
      movement: 100,
      direction: 'up',
    });
  });

  it('returns the empty state when no sessionStorage entry exists', async () => {
    vi.resetModules();
    const mod = await import('./live-activity');
    expect(mod.getLiveRankEstimate()).toEqual({
      liveRank: null,
      movement: null,
      direction: null,
    });
  });

  it('ignores malformed sessionStorage payloads', async () => {
    store['simplyfpl:lastLiveRank'] = '{not valid json';
    vi.resetModules();
    const mod = await import('./live-activity');
    expect(mod.getLiveRankEstimate()).toEqual({
      liveRank: null,
      movement: null,
      direction: null,
    });
  });

  it('ignores payloads where every field is null', async () => {
    store['simplyfpl:lastLiveRank'] = JSON.stringify({
      liveRank: null,
      movement: null,
      direction: null,
    });
    vi.resetModules();
    const mod = await import('./live-activity');
    expect(mod.getLiveRankEstimate()).toEqual({
      liveRank: null,
      movement: null,
      direction: null,
    });
  });
});
