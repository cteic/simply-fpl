import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createReplayClock,
  pauseReplayClock,
  playReplayClock,
  restartReplayClock,
  seekReplayClock,
  setReplaySpeed,
  tickReplayClock,
} from './replay-clock';
import type { ReplayClockInit, ReplayClockState } from './replay-clock';
import type { ReplaySpeed } from './types';

export interface UseReplayClockResult {
  state: ReplayClockState;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  seek: (gw: number) => void;
  setSpeed: (speed: ReplaySpeed) => void;
}

const RAF_FALLBACK_INTERVAL_MS = 50;

export function useReplayClock(init: ReplayClockInit = {}): UseReplayClockResult {
  const [state, setState] = useState<ReplayClockState>(() => createReplayClock(init));
  const lastTickRef = useRef<number | null>(null);
  const playingRef = useRef<boolean>(state.status === 'playing');

  useEffect(() => {
    playingRef.current = state.status === 'playing';
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'playing') {
      lastTickRef.current = null;
      return undefined;
    }
    let frame: ReturnType<typeof setTimeout> | number | null = null;
    let cancelled = false;
    const useRaf =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';

    function step(now: number): void {
      if (cancelled) return;
      const last = lastTickRef.current ?? now;
      const dt = Math.max(0, now - last);
      lastTickRef.current = now;
      if (dt > 0) {
        setState((prev) => tickReplayClock(prev, dt));
      }
      if (!playingRef.current) return;
      if (useRaf) {
        frame = window.requestAnimationFrame(step);
      } else {
        frame = setTimeout(() => step(Date.now()), RAF_FALLBACK_INTERVAL_MS) as unknown as number;
      }
    }

    if (useRaf) {
      frame = window.requestAnimationFrame(step);
    } else {
      frame = setTimeout(() => step(Date.now()), RAF_FALLBACK_INTERVAL_MS) as unknown as number;
    }

    return () => {
      cancelled = true;
      if (frame !== null) {
        if (useRaf) window.cancelAnimationFrame(frame as number);
        else clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
      }
      lastTickRef.current = null;
    };
  }, [state.status]);

  const play = useCallback(() => setState(playReplayClock), []);
  const pause = useCallback(() => setState(pauseReplayClock), []);
  const toggle = useCallback(
    () => setState((s) => (s.status === 'playing' ? pauseReplayClock(s) : playReplayClock(s))),
    []
  );
  const restart = useCallback(() => setState(restartReplayClock), []);
  const seek = useCallback((gw: number) => setState((s) => seekReplayClock(s, gw)), []);
  const setSpeed = useCallback(
    (speed: ReplaySpeed) => setState((s) => setReplaySpeed(s, speed)),
    []
  );

  return { state, play, pause, toggle, restart, seek, setSpeed };
}
