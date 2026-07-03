'use client';

import { useEffect, useRef, useState } from 'react';

import { MOTION_DURATIONS, easeOutQuart, shouldPulse } from '../theme/motion';
import { useReducedMotion } from './use-reduced-motion';

const OVERLAY_PEAK_OPACITY = 0.22;
const SCALE_PEAK_DELTA = 0.012;

export interface PulseFrame {
  overlayOpacity: number;
  scale: number;
  pulseCount: number;
}

export function usePulse(
  pulseKey: string | number | null | undefined,
  durationMs: number = MOTION_DURATIONS.slow
): PulseFrame {
  const reducedMotion = useReducedMotion();
  const previousKeyRef = useRef<string | number | null | undefined>(pulseKey);
  const rafRef = useRef<number | null>(null);
  const [pulseCount, setPulseCount] = useState(0);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const previousKey = previousKeyRef.current;
    previousKeyRef.current = pulseKey;
    if (!shouldPulse(previousKey, pulseKey, reducedMotion)) return undefined;
    if (typeof requestAnimationFrame !== 'function') return undefined;

    setPulseCount((count) => count + 1);
    setProgress(0);
    const start = performance.now();

    function step(now: number): void {
      const linear = Math.min((now - start) / durationMs, 1);
      setProgress(linear);
      if (linear < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [pulseKey, reducedMotion, durationMs]);

  const settled = easeOutQuart(progress);
  return {
    overlayOpacity: OVERLAY_PEAK_OPACITY * (1 - settled),
    scale: 1 + SCALE_PEAK_DELTA * (1 - settled),
    pulseCount,
  };
}
