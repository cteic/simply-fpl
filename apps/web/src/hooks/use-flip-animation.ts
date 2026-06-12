import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FLIP_DURATION_MS = 250;

export function computeFlipDeltas(
  prevPositions: Map<number, number>,
  currentPositions: Map<number, number>
): Map<number, number> {
  const deltas = new Map<number, number>();
  for (const [key, curr] of currentPositions) {
    const prev = prevPositions.get(key);
    if (prev !== undefined && prev !== curr) {
      deltas.set(key, prev - curr);
    }
  }
  return deltas;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useFlipAnimation(orderedKeys: number[]): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevPositionsRef = useRef<Map<number, number>>(new Map());
  const keysKey = orderedKeys.join(',');

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion()) return;

    const currentPositions = new Map<number, number>();
    for (const el of container.querySelectorAll<HTMLElement>('[data-rival-key]')) {
      currentPositions.set(Number(el.dataset.rivalKey), el.getBoundingClientRect().top);
    }

    const deltas = computeFlipDeltas(prevPositionsRef.current, currentPositions);

    for (const [key, delta] of deltas) {
      const el = container.querySelector<HTMLElement>(`[data-rival-key="${key}"]`);
      if (!el) continue;
      el.style.transform = `translateY(${delta}px)`;
      el.style.transition = 'none';
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_DURATION_MS}ms ease`;
        el.style.transform = '';
        el.addEventListener(
          'transitionend',
          () => {
            el.style.transition = '';
          },
          { once: true }
        );
      });
    }
  }, [keysKey]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const newPositions = new Map<number, number>();
    for (const el of container.querySelectorAll<HTMLElement>('[data-rival-key]')) {
      newPositions.set(Number(el.dataset.rivalKey), el.getBoundingClientRect().top);
    }
    prevPositionsRef.current = newPositions;
  });

  return containerRef;
}
