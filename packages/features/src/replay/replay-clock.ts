import { DEFAULT_GW_DURATION_MS } from './types';
import type { ReplaySpeed } from './types';

export interface ReplayClockState {
  status: 'playing' | 'paused' | 'finished';
  gw: number;
  startGw: number;
  endGw: number;
  positionInGwMs: number;
  speed: ReplaySpeed;
  gwDurationMs: number;
}

export interface ReplayClockInit {
  startGw?: number;
  endGw?: number;
  speed?: ReplaySpeed;
  gwDurationMs?: number;
  status?: 'playing' | 'paused';
}

export function createReplayClock(init: ReplayClockInit = {}): ReplayClockState {
  const startGw = init.startGw ?? 1;
  const endGw = init.endGw ?? 38;
  const speed = init.speed ?? 1;
  const gwDurationMs = init.gwDurationMs ?? DEFAULT_GW_DURATION_MS;
  return {
    status: init.status ?? 'paused',
    gw: startGw,
    startGw,
    endGw,
    positionInGwMs: 0,
    speed,
    gwDurationMs,
  };
}

export function tickReplayClock(state: ReplayClockState, dtMs: number): ReplayClockState {
  if (state.status !== 'playing') return state;
  if (dtMs <= 0) return state;
  let position = state.positionInGwMs + dtMs * state.speed;
  let gw = state.gw;
  while (position >= state.gwDurationMs && gw < state.endGw) {
    position -= state.gwDurationMs;
    gw += 1;
  }
  if (gw >= state.endGw && position >= state.gwDurationMs) {
    return {
      ...state,
      gw: state.endGw,
      positionInGwMs: state.gwDurationMs,
      status: 'finished',
    };
  }
  return { ...state, gw, positionInGwMs: position };
}

export function setReplaySpeed(state: ReplayClockState, speed: ReplaySpeed): ReplayClockState {
  return { ...state, speed };
}

export function seekReplayClock(state: ReplayClockState, gw: number): ReplayClockState {
  const clamped = Math.max(state.startGw, Math.min(state.endGw, Math.floor(gw)));
  return {
    ...state,
    gw: clamped,
    positionInGwMs: 0,
    status: state.status === 'finished' ? 'paused' : state.status,
  };
}

export function playReplayClock(state: ReplayClockState): ReplayClockState {
  if (state.status === 'finished') {
    return { ...state, gw: state.startGw, positionInGwMs: 0, status: 'playing' };
  }
  return { ...state, status: 'playing' };
}

export function pauseReplayClock(state: ReplayClockState): ReplayClockState {
  if (state.status === 'finished') return state;
  return { ...state, status: 'paused' };
}

export function restartReplayClock(state: ReplayClockState): ReplayClockState {
  return { ...state, gw: state.startGw, positionInGwMs: 0, status: 'playing' };
}

/**
 * Fractional progress through the current GW in [0, 1]. Used to interpolate
 * archived live-state from "kickoff" (0) to the captured final values (1).
 */
export function gwProgress(state: ReplayClockState): number {
  if (state.gwDurationMs <= 0) return 1;
  const raw = state.positionInGwMs / state.gwDurationMs;
  if (raw <= 0) return 0;
  if (raw >= 1) return 1;
  return raw;
}
