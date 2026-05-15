/**
 * SimplyFPL Color Tokens
 * ----------------------
 * Single source of truth for all colour values across web (Tamagui) and
 * native (StyleSheet) consumers.
 *
 * Naming convention preserves the prototype's short names (--t1, --bg, etc.)
 * for easy 1:1 mapping. Use semantic theme names (`background`, `positive`)
 * in components when possible — fall back to raw tokens when needed.
 */

export const colors = {
  // Surfaces
  bg: '#F7F7F5',
  surface: '#FFFFFF',
  border: '#E9E8E4',
  border2: '#D5D4CF',

  // Text
  t1: '#1A1A18',
  t2: '#6B6B63',
  t3: '#A8A8A0',

  // Positive (rank up, price rise, "live", FDR1-2)
  green: '#15803D',
  gbg: '#F0FDF4',
  gmid: '#DCFCE7',

  // Negative (rank down, price fall, FDR5)
  red: '#DC2626',
  rbg: '#FEF2F2',

  // Warning (Pro features, FDR3)
  amber: '#D97706',
  abg: '#FFFBEB',
  amid: '#FDE68A',

  // Informational (captain, "you" indicator)
  blue: '#2563EB',
  bbg: '#EFF6FF',

  // Position-coloured shirts (pitch view)
  shirtGk: '#FEF3C7',
  shirtDef: '#DBEAFE',
  shirtMid: '#DCFCE7',
  shirtFwd: '#FCE7F3',
  shirtBch: '#F3F4F6',

  // FDR scale
  fdr1: '#16A34A',
  fdr2: '#65A30D',
  fdr3: '#CA8A04',
  fdr4: '#EA580C',
  fdr5: '#DC2626',

  // Brand (mono lockup wordmark + s. favicon)
  brand: '#0F766E',
  brandHover: '#115E59',
  brandBg: '#F0FDFA',

  // Special
  youRow: '#F5F5FF',
  youRowHover: '#EDEDFD',
  buttonHover: '#2D2D2A',

  // True transparent / white / black for occasional needs
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
