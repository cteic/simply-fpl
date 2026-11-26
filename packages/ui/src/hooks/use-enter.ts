'use client';

import { useEffect, useRef, useState } from 'react';

import { MOTION_DURATIONS, easeOutQuart } from '../theme/motion';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Progress of a mount animation, 0 at first paint and 1 once settled.
 *
 * Driven by requestAnimationFrame like usePulse, so the same code animates on
 * web and native with no animation driver to configure. With reduced motion
 * requested it starts settled.
 */
export function useEnter(durationMs: number = MOTION_DURATIONS.slow): number {
  const reducedMotion = useReducedMotion();
  const rafRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion || typeof requestAnimationFrame !== 'function') {
      setProgress(1);
      return undefined;
    }
    const start = performance.now();

    function step(now: number): void {
      const linear = Math.min((now - start) / durationMs, 1);
      setProgress(easeOutQuart(linear));
      if (linear < 1) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, durationMs]);

  return progress;
}
