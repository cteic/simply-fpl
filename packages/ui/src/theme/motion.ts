export const MOTION_DURATIONS = {
  fast: 120,
  medium: 250,
  slow: 350,
  bar: 1200,
} as const;

export type MotionDuration = keyof typeof MOTION_DURATIONS;

export const MOTION_EASINGS = {
  easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  linear: 'linear',
} as const;

export type MotionEasing = keyof typeof MOTION_EASINGS;

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function shouldPulse(
  previousKey: string | number | null | undefined,
  nextKey: string | number | null | undefined,
  reducedMotion: boolean
): boolean {
  if (reducedMotion) return false;
  if (previousKey === null || previousKey === undefined) return false;
  if (nextKey === null || nextKey === undefined) return false;
  return previousKey !== nextKey;
}
