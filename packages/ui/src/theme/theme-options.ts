import type { ThemeName } from '@simplyfpl/types';

export interface ThemeOption {
  name: ThemeName;
  label: string;
  description: string;
  swatch: [string, string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    name: 'stadium',
    label: 'Stadium',
    description: 'Floodlit teal — the matchday default.',
    swatch: ['#1A8A6E', '#0F766E', '#5EEAD4'],
  },
  {
    name: 'bold',
    label: 'Bold',
    description: 'Dark broadcast with a mint accent.',
    swatch: ['#0E0E0C', '#1B1B17', '#5EEAD4'],
  },
  {
    name: 'quiet',
    label: 'Quiet',
    description: 'Light, Swiss-minimal and calm.',
    swatch: ['#FFFFFF', '#F7F7F5', '#0F766E'],
  },
];
