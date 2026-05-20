import { describe, expect, it } from 'vitest';

import { buildReplayWsUrl } from './replay-url';

describe('buildReplayWsUrl', () => {
  it('builds a ws:// replay endpoint with gw, replay id and speed', () => {
    const url = buildReplayWsUrl({
      apiUrl: 'http://localhost:8787',
      gw: 37,
      recordingId: 'gw37',
      speed: 10,
    });
    expect(url).toBe('ws://localhost:8787/live/ws?gw=37&replay=gw37&speed=10');
  });

  it('defaults to 1x speed for demos', () => {
    const url = buildReplayWsUrl({ apiUrl: 'http://localhost:8787', gw: 37, recordingId: 'gw37' });
    expect(url).toBe('ws://localhost:8787/live/ws?gw=37&replay=gw37&speed=1');
  });

  it('upgrades https origins to wss and trims trailing slashes', () => {
    const url = buildReplayWsUrl({
      apiUrl: 'https://worker.example.com/',
      gw: 36,
      recordingId: 'gw36-2026-05-13',
      speed: 60,
    });
    expect(url).toBe('wss://worker.example.com/live/ws?gw=36&replay=gw36-2026-05-13&speed=60');
  });
});
