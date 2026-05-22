import type { ThemeName } from '@simplyfpl/types';

import { colors } from './colors';
import { stadiumGradient, stadiumHeroGradient } from './gradients';

const boldGradient = `radial-gradient(125% 125% at 88% -15%, ${colors.ink2} 0%, ${colors.ink} 55%, ${colors.ink3} 100%)`;
const boldGlow = `radial-gradient(80% 70% at 50% -15%, rgba(94,234,212,0.12), transparent 60%)`;
const boldHeroGradient = `${boldGlow}, ${boldGradient}`;

export function resolveThemeName(name: string): ThemeName {
  return name === 'bold' || name === 'quiet' ? name : 'stadium';
}

export type FeatureSurfaceVariant = 'panel' | 'hero';

export interface FeatureSurfaceStyle {
  backgroundImage?: string;
  borderWidth: number;
}

export function featureSurfaceStyle(
  theme: ThemeName,
  variant: FeatureSurfaceVariant
): FeatureSurfaceStyle {
  if (theme === 'quiet') {
    return { borderWidth: 1 };
  }
  if (theme === 'bold') {
    return {
      backgroundImage: variant === 'hero' ? boldHeroGradient : boldGradient,
      borderWidth: 0,
    };
  }
  return {
    backgroundImage: variant === 'hero' ? stadiumHeroGradient : stadiumGradient,
    borderWidth: 0,
  };
}
