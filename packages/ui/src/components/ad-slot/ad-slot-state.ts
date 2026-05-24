export type AdSlotState = 'hidden' | 'placeholder' | 'active';

export function resolveAdSlotState(): AdSlotState {
  if (process.env.NEXT_PUBLIC_FEATURE_ADS === 'true') return 'active';
  if (process.env.NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS === 'true') return 'placeholder';
  return 'hidden';
}
