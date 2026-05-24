import type { ThemeName } from '@simplyfpl/types';

export type HeroVariant = 'floodlit' | 'broadcast' | 'bare';
export type StatTileVariant = 'accent' | 'grid' | 'hairline';
export type PitchHeaderVariant = 'gradient' | 'border';

export interface CardShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}

export interface ThemeDesign {
  name: ThemeName;
  hero: HeroVariant;
  statTiles: StatTileVariant;
  pitchHeader: PitchHeaderVariant;
  pitchGrass: boolean;
  cardRadius: number;
  cardShadow: CardShadow;
  heroNumberWeight: '300' | '400' | '500' | '600' | '700';
  heroLogo: boolean;
  heroChipText: string;
}

const STADIUM: ThemeDesign = {
  name: 'stadium',
  hero: 'floodlit',
  statTiles: 'accent',
  pitchHeader: 'gradient',
  pitchGrass: true,
  cardRadius: 14,
  cardShadow: {
    shadowColor: '#14281E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
  },
  heroNumberWeight: '400',
  heroLogo: true,
  heroChipText: '#0B4F49',
};

const BOLD: ThemeDesign = {
  name: 'bold',
  hero: 'broadcast',
  statTiles: 'grid',
  pitchHeader: 'border',
  pitchGrass: false,
  cardRadius: 12,
  cardShadow: {
    shadowColor: '#0E0E0C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  heroNumberWeight: '500',
  heroLogo: true,
  heroChipText: '#0E0E0C',
};

const QUIET: ThemeDesign = {
  name: 'quiet',
  hero: 'bare',
  statTiles: 'hairline',
  pitchHeader: 'border',
  pitchGrass: false,
  cardRadius: 10,
  cardShadow: {
    shadowColor: '#14140F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
  },
  heroNumberWeight: '300',
  heroLogo: false,
  heroChipText: '#FFFFFF',
};

const DESIGN_BY_NAME: Record<ThemeName, ThemeDesign> = {
  stadium: STADIUM,
  bold: BOLD,
  quiet: QUIET,
};

export function getThemeDesign(name: ThemeName): ThemeDesign {
  return DESIGN_BY_NAME[name];
}
