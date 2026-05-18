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
