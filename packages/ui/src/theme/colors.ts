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
  bg: '#F6F7F4',
  surface: '#FFFFFF',
  border: '#E2E4DC',
  border2: '#CDD0C5',

  // Text
  t1: '#15201A',
  t2: '#566055',
  t3: '#869083',

  // Positive (rank up, price rise, "live", FDR1-2)
  green: '#15803D',
  gbg: '#EAF7EE',
  gmid: '#C6EBD2',

  // Negative (rank down, price fall, FDR5)
  red: '#C2333B',
  rbg: '#FBEBEC',

  // Warning (Pro features, FDR3)
  amber: '#B45309',
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

  // ── Stadium ────────────────────────────────────────────────────────────
  // Teal "matchday" gradient surfaces (hero, page headers, live-rank card).
  // Stops run brightest → darkest; the shared gradients in `gradients.ts`
  // compose them. stadium2 matches $brand.
  stadium1: '#1A8A6E',
  stadium2: '#0F766E',
  stadium3: '#0B4F49',
  stadium4: '#082E2A',
  // Mint accents on the teal field (eyebrow, CTA, sparkline, accent text).
  stadiumAccent: '#34D399',
  stadiumAccentStrong: '#38E4A5',
  // Error text legible on the teal field.
  stadiumDanger: '#FCA5A5',

  // ── Inverse content ────────────────────────────────────────────────────
  // White text ladder for use on stadium / any dark teal surface.
  inverse: '#FFFFFF',
  inverseStrong: 'rgba(255,255,255,0.8)',
  inverseMuted: 'rgba(255,255,255,0.72)',
  inverseSoft: 'rgba(255,255,255,0.55)',
  inverseFaint: 'rgba(255,255,255,0.4)',

  // ── Overlay scale ──────────────────────────────────────────────────────
  // White fills / borders / tracks on teal surfaces, faint → strong.
  overlay1: 'rgba(255,255,255,0.06)',
  overlay2: 'rgba(255,255,255,0.1)',
  overlay3: 'rgba(255,255,255,0.12)',
  overlay4: 'rgba(255,255,255,0.18)',
  overlay5: 'rgba(255,255,255,0.28)',
  overlay6: 'rgba(255,255,255,0.45)',

  ink: '#0E0E0C',
  ink2: '#1B1B17',
  ink3: '#070706',
  brandLite: '#5EEAD4',

  neutralBg: '#F7F7F5',
  neutralSurface: '#FFFFFF',
  neutralBorder: '#DDDCD6',
  neutralBorder2: '#C9C8C1',
  neutralT1: '#1A1A18',
  neutralT2: '#605F57',
  neutralT3: '#8A8A82',

  neutralFaint: 'rgba(20,20,16,0.03)',
  neutralSoft: 'rgba(20,20,16,0.06)',
  neutralMid: 'rgba(20,20,16,0.1)',
  neutralStrong: 'rgba(20,20,16,0.16)',

  // True transparent / white / black for occasional needs
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
