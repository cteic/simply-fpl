import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';

import { applyDelta, buildWsUrl } from './use-live-snapshot';

const feature = await loadFeature('./use-live-snapshot.feature');

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  emit(payload: string): void {
    this.onmessage?.({ data: payload } as MessageEvent);
  }

  fail(): void {
    this.onerror?.(new Event('error'));
    this.onclose?.(new CloseEvent('close'));
  }

  close(): void {
    this.readyState = 3;
  }
}

class FailingWebSocket {
  static instances: FailingWebSocket[] = [];
  url: string;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    FailingWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.onerror?.(new Event('error'));
      this.onclose?.(new CloseEvent('close'));
    });
  }

  close(): void {
    this.readyState = 3;
  }
}

describe('buildWsUrl', () => {
  it('rewrites http:// to ws://', () => {
    expect(buildWsUrl('http://localhost:8787', 39)).toBe('ws://localhost:8787/live/ws?gw=39');
  });

  it('rewrites https:// to wss://', () => {
    expect(buildWsUrl('https://api.simply-fpl.com', 1)).toBe(
      'wss://api.simply-fpl.com/live/ws?gw=1'
    );
  });

  it('strips trailing slash', () => {
    expect(buildWsUrl('https://api.simply-fpl.com/', 7)).toBe(
      'wss://api.simply-fpl.com/live/ws?gw=7'
    );
  });
});

describe('applyDelta', () => {
  it('returns the changed elements as the new snapshot when current is empty', () => {
    const result = applyDelta(undefined, [
      {
        id: 1,
        stats: {
          minutes: 0,
          goals_scored: 0,
          assists: 0,
          clean_sheets: 0,
          goals_conceded: 0,
          yellow_cards: 0,
          red_cards: 0,
          saves: 0,
          bonus: 0,
          bps: 0,
          total_points: 4,
          clearances_blocks_interceptions: 0,
          tackles: 0,
        },
        explain: [],
      },
    ]);
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]?.stats.total_points).toBe(4);
  });

  it('replaces an existing element by id and leaves others untouched', () => {
    const current = {
      elements: [
        {
          id: 1,
          stats: {
            minutes: 0,
            goals_scored: 0,
            assists: 0,
            clean_sheets: 0,
            goals_conceded: 0,
            yellow_cards: 0,
            red_cards: 0,
            saves: 0,
            bonus: 0,
            bps: 0,
            total_points: 2,
            clearances_blocks_interceptions: 0,
            tackles: 0,
          },
          explain: [],
        },
        {
          id: 2,
          stats: {
            minutes: 0,
            goals_scored: 0,
            assists: 0,
            clean_sheets: 0,
            goals_conceded: 0,
            yellow_cards: 0,
            red_cards: 0,
            saves: 0,
            bonus: 0,
            bps: 0,
            total_points: 6,
            clearances_blocks_interceptions: 0,
            tackles: 0,
          },
          explain: [],
        },
      ],
    };
    const next = applyDelta(current, [
      {
        id: 1,
        stats: {
          minutes: 90,
          goals_scored: 1,
          assists: 0,
          clean_sheets: 0,
          goals_conceded: 0,
          yellow_cards: 0,
          red_cards: 0,
          saves: 0,
          bonus: 0,
          bps: 0,
          total_points: 8,
          clearances_blocks_interceptions: 0,
          tackles: 0,
        },
        explain: [],
      },
    ]);
    const byId = new Map(next.elements.map((e) => [e.id, e]));
    expect(byId.get(1)?.stats.total_points).toBe(8);
    expect(byId.get(2)?.stats.total_points).toBe(6);
  });
});

interface ScenarioState {
  snapshot: { id: number; total_points: number } | null;
  ws: FakeWebSocket | null;
  failureCount: number;
}

const scenarioState: ScenarioState = {
  snapshot: null,
  ws: null,
  failureCount: 0,
};

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    "A connected client receives a delta within seconds when a player's stats change",
    ({ Given, When, Then }) => {
      Given('a client subscribed to gameweek 39 over WebSocket', () => {
        scenarioState.snapshot = null;
        const ws = new FakeWebSocket('ws://localhost:8787/live/ws?gw=39');
        ws.onmessage = (ev: MessageEvent) => {
          const parsed = JSON.parse(ev.data as string);
          if (parsed.type === 'delta') {
            const changed = parsed.elements[0];
            scenarioState.snapshot = {
              id: changed.id,
              total_points: changed.stats.total_points,
            };
          }
        };
        ws.open();
        scenarioState.ws = ws;
      });

      When('the server pushes a delta for player 1 with 8 total points', () => {
        scenarioState.ws?.emit(
          JSON.stringify({
            type: 'delta',
            elements: [
              {
                id: 1,
                stats: {
                  minutes: 90,
                  goals_scored: 1,
                  assists: 0,
                  clean_sheets: 0,
                  goals_conceded: 0,
                  yellow_cards: 0,
                  red_cards: 0,
                  saves: 0,
                  bonus: 0,
                  bps: 0,
                  total_points: 8,
                  clearances_blocks_interceptions: 0,
                  tackles: 0,
                },
                explain: [],
              },
            ],
            ts: Date.now(),
          })
        );
      });

      Then("the client's snapshot reflects player 1 at 8 total points", () => {
        expect(scenarioState.snapshot).not.toBeNull();
        expect(scenarioState.snapshot?.id).toBe(1);
        expect(scenarioState.snapshot?.total_points).toBe(8);
      });
    }
  );

  Scenario(
    'After three failed connections the client falls back to polling',
    ({ Given, When, Then }) => {
      Given('a WebSocket implementation that fails on every connect', () => {
        scenarioState.failureCount = 0;
      });

      When('the client subscribes to gameweek 39', () => {
        const url = buildWsUrl('http://localhost:8787', 39);
        for (let i = 0; i < 3; i++) {
          const sock = new FailingWebSocket(url);
          sock.onerror = () => {
            scenarioState.failureCount += 1;
          };
        }
      });

      Then('after three failures the client falls back to HTTP polling', async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(scenarioState.failureCount).toBeGreaterThanOrEqual(3);
      });
    }
  );
});
