import type { FplLiveElement, FplLiveGameweek } from '@simplyfpl/types';

export function diffLiveSnapshots(
  prev: FplLiveGameweek | null,
  next: FplLiveGameweek
): FplLiveElement[] {
  if (!prev) return next.elements;

  const prevById = new Map<number, FplLiveElement>();
  for (const el of prev.elements) {
    prevById.set(el.id, el);
  }

  const changed: FplLiveElement[] = [];
  for (const el of next.elements) {
    const previous = prevById.get(el.id);
    if (!previous) {
      changed.push(el);
      continue;
    }
    if (JSON.stringify(previous.stats) !== JSON.stringify(el.stats)) {
      changed.push(el);
    }
  }
  return changed;
}
