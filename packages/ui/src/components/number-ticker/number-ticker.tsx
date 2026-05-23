'use client';

import { useEffect, useRef, useState } from 'react';

import { Text } from 'tamagui';
import type { TextProps } from 'tamagui';

/**
 * NumberTicker
 * ------------
 * Eases a number to its new value when it CHANGES (e.g. a live rank update),
 * counting from the previous value rather than from zero. On first render it
 * shows the value immediately — no count-up from zero — which keeps it honest
 * on load and deterministic for snapshot tests. Pass a `format` to control how
 * the number is rendered (e.g. `toLocaleString`). Renders `placeholder` for
 * null. Eased over `durationMs` (kept ≤ 1.2s per the design system).
 */

interface NumberTickerProps extends Omit<TextProps, 'children'> {
  value: number | null;
  format?: (value: number) => string;
  durationMs?: number;
  placeholder?: string;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function NumberTicker({
  value,
  format = (n) => String(n),
  durationMs = 700,
  placeholder = '—',
  ...textProps
}: NumberTickerProps) {
  const [display, setDisplay] = useState<number | null>(value);
  const fromRef = useRef<number | null>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;

    if (value === null) {
      setDisplay(null);
      fromRef.current = null;
      return undefined;
    }

    if (from === null || from === value) {
      setDisplay(value);
      fromRef.current = value;
      return undefined;
    }

    const start = performance.now();
    const startVal = from;
    const target = value;

    function step(now: number): void {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = easeOutQuart(progress);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return <Text {...textProps}>{display === null ? placeholder : format(display)}</Text>;
}
