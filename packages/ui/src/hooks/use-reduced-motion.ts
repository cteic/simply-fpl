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
    media.addEventListener('change', onChange);
    setReduced(media.matches);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, []);

  return reduced;
}
