'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function readPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const media = window.matchMedia(QUERY);
    function onChange(event: MediaQueryListEvent): void {
      setReduced(event.matches);
    }
    setReduced(media.matches);

    // Some environments provide a partial matchMedia whose MediaQueryList has
    // no listener methods. Read the value, then subscribe only if we can.
    if (typeof media.addEventListener !== 'function') {
      return undefined;
    }
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  return reduced;
}
