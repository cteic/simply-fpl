import { useEffect, useState, useSyncExternalStore } from 'react';

let lastUpdateMs: number | null = null;
const listeners = new Set<() => void>();

export function setLiveLastUpdate(ms: number): void {
  lastUpdateMs = ms;
  for (const listener of listeners) listener();
}

export function getLiveLastUpdate(): number | null {
  return lastUpdateMs;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLiveLastUpdate(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => lastUpdateMs,
    () => null
  );
}

export function useLiveAgoMs(): number | null {
  const last = useLiveLastUpdate();
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (last === null) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [last]);
  if (last === null) return null;
  return Math.max(0, now - last);
}

export interface LiveRankState {
  liveRank: number | null;
  movement: number | null;
  direction: 'up' | 'down' | 'flat' | null;
}

const EMPTY_LIVE_RANK_STATE: LiveRankState = {
  liveRank: null,
  movement: null,
  direction: null,
};

const LIVE_RANK_STORAGE_KEY = 'simplyfpl:lastLiveRank';

function readPersistedLiveRank(): LiveRankState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(LIVE_RANK_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const liveRank =
      'liveRank' in parsed && typeof parsed.liveRank === 'number' ? parsed.liveRank : null;
    const movement =
      'movement' in parsed && typeof parsed.movement === 'number' ? parsed.movement : null;
    const directionRaw = 'direction' in parsed ? parsed.direction : null;
    const direction =
      directionRaw === 'up' || directionRaw === 'down' || directionRaw === 'flat'
        ? directionRaw
        : null;
    if (liveRank === null && movement === null && direction === null) return null;
    return { liveRank, movement, direction };
  } catch {
    return null;
  }
}

function persistLiveRank(state: LiveRankState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(LIVE_RANK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}

let liveRankState: LiveRankState = readPersistedLiveRank() ?? EMPTY_LIVE_RANK_STATE;
const liveRankListeners = new Set<() => void>();

export function setLiveRankEstimate(state: LiveRankState): void {
  liveRankState = state;
  persistLiveRank(state);
  for (const listener of liveRankListeners) listener();
}

export function getLiveRankEstimate(): LiveRankState {
  return liveRankState;
}

function subscribeLiveRank(listener: () => void): () => void {
  liveRankListeners.add(listener);
  return () => {
    liveRankListeners.delete(listener);
  };
}

export function useLiveRankEstimate(): LiveRankState {
  return useSyncExternalStore(
    subscribeLiveRank,
    () => liveRankState,
    () => EMPTY_LIVE_RANK_STATE
  );
}
