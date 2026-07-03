export type AdSlotState = 'hidden' | 'placeholder' | 'active';

export interface ResolveAdSlotStateOptions {
  adFree?: boolean;
}

export function resolveAdSlotState(options?: ResolveAdSlotStateOptions): AdSlotState {
  if (options?.adFree) return 'hidden';
  if (process.env.NEXT_PUBLIC_FEATURE_ADS === 'true') return 'active';
  if (process.env.NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS === 'true') return 'placeholder';
  return 'hidden';
}
