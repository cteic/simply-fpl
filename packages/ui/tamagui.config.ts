import { createAnimations } from '@tamagui/animations-react-native';
import { shorthands } from '@tamagui/shorthands';
import { createFont, createTamagui, createTokens } from 'tamagui';

import { colors } from './src/theme/colors';
import { radius, size, space, zIndex } from './src/theme/spacing';

/**
 * SimplyFPL Tamagui Configuration
 * --------------------------------
 * Tokens are derived from the prototype at apps/web/design/simplyfpl-demo.html
 * and documented in packages/ui/DESIGN_SYSTEM.md.
 *
 * Reference values come from src/theme/* — those files are the single source
 * of truth and are also consumed directly by React Native StyleSheet code
 * if/when needed.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Animations
// ─────────────────────────────────────────────────────────────────────────────

const animations = createAnimations({
  fast: {
    type: 'timing',
    duration: 120,
  },
  medium: {
    type: 'timing',
    duration: 250,
  },
  slow: {
    type: 'timing',
    duration: 350,
  },
  // For progress bars and rank counter — 1.2s, ease-out cubic
  bar: {
    type: 'timing',
    duration: 1200,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Fonts
// ─────────────────────────────────────────────────────────────────────────────

const dmSans = createFont({
  family: 'DM Sans, -apple-system, BlinkMacSystemFont, sans-serif',
  size: {
    1: 9.2, // tiny meta / progress labels (0.61rem at 15px base)
    2: 10, // section labels uppercase (0.67rem)
    3: 10.6, // delta chips (0.71rem)
    4: 11, // secondary meta (0.73rem)
    5: 11.4, // filter buttons (0.76rem)
    6: 11.7, // footer note (0.78rem)
    7: 11.9, // button (0.79rem)
    8: 12, // body / table data (0.8rem)
    9: 12.2, // nav link (0.815rem)
    10: 12.3, // pitch title (0.82rem)
    11: 12.75, // card heading (0.85rem)
    12: 13.5, // logo (0.9rem)
    13: 21, // page title (1.4rem)
    14: 30, // stat hero numbers (2rem)
  },
  lineHeight: {
    1: 13,
    2: 14,
    3: 15,
    4: 16,
    5: 17,
    6: 18,
    7: 18,
    8: 19,
    9: 19,
    10: 20,
    11: 20,
    12: 21,
    13: 25,
    14: 30,
  },
  weight: {
    1: '400',
    2: '450',
    3: '500',
    4: '600',
    5: '700',
  },
  letterSpacing: {
    1: -0.04, // hero numbers (em-equivalent at their size)
    2: -0.035, // page titles
    3: -0.025, // logo
    4: -0.02, // card headings
    5: -0.015, // body
    6: -0.01, // small UI
    7: 0,
    8: 0.04, // small caps badges
    9: 0.05, // live pill
    10: 0.07, // section labels
    11: 0.08, // section titles
  },
  face: {
    400: { normal: 'DMSans-Regular' },
    500: { normal: 'DMSans-Medium' },
    600: { normal: 'DMSans-SemiBold' },
    700: { normal: 'DMSans-Bold' },
  },
});

const dmMono = createFont({
  family: 'DM Mono, ui-monospace, SFMono-Regular, monospace',
  size: {
    1: 8.7, // tiny mono (0.58rem)
    2: 9.5, // pos numbers, bench badges (0.63rem)
    3: 10, // small mono (0.67rem)
    4: 11.25, // table positions (0.75rem)
    5: 12, // body mono (0.8rem)
    6: 12.75, // strong mono (0.85rem)
    7: 30, // hero numbers (2rem)
  },
  lineHeight: {
    1: 12,
    2: 13,
    3: 14,
    4: 15,
    5: 16,
    6: 17,
    7: 30,
  },
  weight: {
    1: '300',
    2: '400',
    3: '500',
  },
  letterSpacing: {
    1: -0.04,
    2: 0,
  },
  face: {
    300: { normal: 'DMMono-Light' },
    400: { normal: 'DMMono-Regular' },
    500: { normal: 'DMMono-Medium' },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────────────────────

const tokens = createTokens({
  color: colors,
  space,
  size,
  radius,
  zIndex,
});

// ─────────────────────────────────────────────────────────────────────────────
// Themes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Light theme is the primary (and currently only) theme.
 * Dark theme can be added later by mapping the same semantic names to dark
 * equivalents. The prototype is light-only.
 */
const light = {
  // Surfaces
  background: colors.bg,
  surface: colors.surface,
  border: colors.border,
  borderStrong: colors.border2,

  // Text
  color: colors.t1,
  colorMuted: colors.t2,
  colorSubtle: colors.t3,

  // Semantic
  positive: colors.green,
  positiveBg: colors.gbg,
  positiveBorder: colors.gmid,
  negative: colors.red,
  negativeBg: colors.rbg,
  warning: colors.amber,
  warningBg: colors.abg,
  warningBorder: colors.amid,
  info: colors.blue,
  infoBg: colors.bbg,

  // Brand (mono lockup wordmark + s. favicon)
  brand: colors.brand,
  brandHover: colors.brandHover,
  brandBg: colors.brandBg,

  // Position shirt backgrounds
  shirtGk: colors.shirtGk,
  shirtDef: colors.shirtDef,
  shirtMid: colors.shirtMid,
  shirtFwd: colors.shirtFwd,
  shirtBch: colors.shirtBch,

  // FDR scale
  fdr1: colors.fdr1,
  fdr2: colors.fdr2,
  fdr3: colors.fdr3,
  fdr4: colors.fdr4,
  fdr5: colors.fdr5,

  // Special highlight rows
  youRow: colors.youRow,
  youRowHover: colors.youRowHover,

  // Buttons
  buttonPrimary: colors.t1,
  buttonPrimaryHover: colors.buttonHover,
};

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export const config = createTamagui({
  settings: {
    defaultFont: 'body',
    shouldAddPrefersColorThemes: false,
    addThemeClassName: false,
  },
  animations,
  fonts: {
    body: dmSans,
    mono: dmMono,
  },
  themes: {
    light,
    // Tamagui requires at least one theme; we provide light as default
  },
  tokens,
  shorthands,
  media: {
    sm: { maxWidth: 680 },
    md: { maxWidth: 960 },
    lg: { minWidth: 961 },
  },
});

export default config;

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
