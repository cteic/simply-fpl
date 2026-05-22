import { useEffect, useState } from 'react';

import { formatTimeRemaining } from '@simplyfpl/fpl-client';

export interface CountdownResult {
  remainingMs: number | null;
  label: string | null;
  isPast: boolean;
}

/**
 * Ticks once a second and reports the time remaining until `targetIso`.
 * Returns nulls when no target is given or the date is unparseable, so callers
 * can simply skip rendering. Used by the nav-bar gameweek-deadline countdown.
 */
export function useCountdown(targetIso: string | null): CountdownResult {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (targetIso === null) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (targetIso === null) return { remainingMs: null, label: null, isPast: false };
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return { remainingMs: null, label: null, isPast: false };

  const remainingMs = target - now;
  return {
    remainingMs,
    label: formatTimeRemaining(remainingMs),
    isPast: remainingMs <= 0,
  };
}
