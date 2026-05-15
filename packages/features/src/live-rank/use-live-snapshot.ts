import { useEffect, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { fplClient } from '@simplyfpl/fpl-client';
import type { FplLiveElement, FplLiveGameweek } from '@simplyfpl/types';

const DEFAULT_API_URL = 'http://localhost:8787';
const MAX_FAILURES_BEFORE_FALLBACK = 3;
const RECONNECT_BACKOFFS_MS = [1_000, 2_000, 4_000];
const POLL_INTERVAL_MS = 60_000;

export interface UseLiveSnapshotResult {
  data: FplLiveGameweek | undefined;
  source: 'ws' | 'polling' | 'idle';
  isFallback: boolean;
}

interface IncomingMessage {
  type?: unknown;
  data?: unknown;
  elements?: unknown;
  ts?: unknown;
}

function isLiveElement(value: unknown): value is FplLiveElement {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { id?: unknown; stats?: unknown };
  return typeof candidate.id === 'number' && typeof candidate.stats === 'object';
}

function isLiveGameweek(value: unknown): value is FplLiveGameweek {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { elements?: unknown };
  return Array.isArray(candidate.elements);
}

export function buildWsUrl(apiUrl: string, gw: number): string {
  const wsUrl = apiUrl.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
  return `${wsUrl.replace(/\/$/, '')}/live/ws?gw=${gw}`;
}

export function applyDelta(
  current: FplLiveGameweek | undefined,
  changed: FplLiveElement[]
): FplLiveGameweek {
  const base = current ?? { elements: [] };
  const byId = new Map<number, FplLiveElement>();
  for (const el of base.elements) byId.set(el.id, el);
  for (const el of changed) byId.set(el.id, el);
  return { elements: Array.from(byId.values()) };
}

export function useLiveSnapshot(
  gw: number | null,
  options: { apiUrl?: string; webSocketImpl?: typeof WebSocket } = {}
): UseLiveSnapshotResult {
  const apiUrl =
    options.apiUrl ??
    (typeof process !== 'undefined' ? process.env['NEXT_PUBLIC_API_URL'] : undefined) ??
    DEFAULT_API_URL;

  const [data, setData] = useState<FplLiveGameweek | undefined>(undefined);
  const [shouldFallback, setShouldFallback] = useState(false);
  const failuresRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (gw === null) return;
    if (shouldFallback) return;

    const WSImpl = options.webSocketImpl ?? (typeof WebSocket !== 'undefined' ? WebSocket : null);
    if (!WSImpl) {
      setShouldFallback(true);
      return;
    }

    let cancelled = false;

    function clearReconnect(): void {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function connect(): void {
      if (cancelled) return;
      if (!WSImpl) return;
      const url = buildWsUrl(apiUrl, gw as number);
      let socket: WebSocket;
      try {
        socket = new WSImpl(url);
      } catch {
        handleFailure();
        return;
      }
      wsRef.current = socket;

      socket.onopen = () => {
        failuresRef.current = 0;
      };

      socket.onmessage = (event: MessageEvent) => {
        const raw = typeof event.data === 'string' ? event.data : null;
        if (!raw) return;
        let parsed: IncomingMessage;
        try {
          parsed = JSON.parse(raw) as IncomingMessage;
        } catch {
          return;
        }
        if (parsed.type === 'snapshot' && isLiveGameweek(parsed.data)) {
          setData(parsed.data);
        } else if (parsed.type === 'delta' && Array.isArray(parsed.elements)) {
          const changed = parsed.elements.filter(isLiveElement);
          if (changed.length === 0) return;
          setData((current) => applyDelta(current, changed));
        }
      };

      socket.onerror = () => {
        handleFailure();
      };

      socket.onclose = () => {
        if (cancelled) return;
        handleFailure();
      };
    }

    function handleFailure(): void {
      failuresRef.current += 1;
      if (failuresRef.current >= MAX_FAILURES_BEFORE_FALLBACK) {
        setShouldFallback(true);
        return;
      }
      const delay =
        RECONNECT_BACKOFFS_MS[failuresRef.current - 1] ??
        RECONNECT_BACKOFFS_MS[RECONNECT_BACKOFFS_MS.length - 1] ??
        1_000;
      clearReconnect();
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    }

    connect();

    return () => {
      cancelled = true;
      clearReconnect();
      const sock = wsRef.current;
      if (sock) {
        sock.onopen = null;
        sock.onmessage = null;
        sock.onerror = null;
        sock.onclose = null;
        try {
          sock.close();
        } catch {
          /* swallow */
        }
        wsRef.current = null;
      }
    };
  }, [gw, apiUrl, shouldFallback, options.webSocketImpl]);

  const polling = useQuery({
    queryKey: ['live-snapshot-fallback', gw],
    queryFn: () => {
      if (gw === null) throw new Error('gw required');
      return fplClient.getLiveGameweek(gw);
    },
    enabled: gw !== null && shouldFallback,
    refetchInterval: POLL_INTERVAL_MS,
  });

  if (shouldFallback) {
    return {
      data: polling.data,
      source: 'polling',
      isFallback: true,
    };
  }

  return {
    data,
    source: data ? 'ws' : 'idle',
    isFallback: false,
  };
}
