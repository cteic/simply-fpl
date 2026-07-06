export type StatTileTone = 'positive' | 'brand' | 'neutral' | 'warning' | 'negative';

export interface StatTileToneStyle {
  backgroundColor: string;
  borderLeftColor: string;
}

const TONE_STYLES: Record<StatTileTone, StatTileToneStyle> = {
  positive: { backgroundColor: '$positiveBg', borderLeftColor: '$positive' },
  brand: { backgroundColor: '$brandBg', borderLeftColor: '$brand' },
  warning: { backgroundColor: '$warningBg', borderLeftColor: '$warning' },
  neutral: { backgroundColor: '$surface', borderLeftColor: '$borderStrong' },
  negative: { backgroundColor: '$surface', borderLeftColor: '$negative' },
};

export function statTileToneStyle(tone: StatTileTone): StatTileToneStyle {
  return TONE_STYLES[tone];
}
