/**
 * SimplyFPL Spacing & Layout Tokens
 * ---------------------------------
 * Spacing scale matches the values observed in the prototype. Tamagui requires
 * a `size` scale matching `space` for some layout primitives; we mirror them.
 */

// Numeric scale used directly by both space and size tokens.
// Tamagui convention: scale is roughly Fibonacci-ish; we hew closer to the
// prototype's actual values.
export const space = {
  0: 0,
  1: 4,
  2: 6,
  3: 8,
  4: 10,
  5: 12,
  6: 14,
  7: 16,
  8: 18,
  9: 20,
  10: 24,
  11: 28,
  12: 32,
  13: 40,
  14: 48,
  15: 64,
  16: 80,
  // Negative (Tamagui convention for negative margins)
  '-1': -4,
  '-2': -6,
  '-3': -8,
  '-4': -10,
  true: 10, // default
} as const;

export const size = {
  ...space,
  // Container sizes
  page: 960,
  navHeight: 54,
  shirt: 44,
  badge: 18,
} as const;

export const radius = {
  0: 0,
  1: 3, // tiny chips, position tags
  2: 4, // delta chips, FDR squares
  3: 6, // --rs — buttons, nav links, inputs
  4: 7, // logomark
  5: 9, // shirt
  6: 10, // --r — cards, panels
  7: 20, // pills
  true: 6,
} as const;

export const zIndex = {
  0: 0,
  1: 100,
  2: 200, // sticky nav
  3: 300,
  4: 1000,
  5: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2, // Android
  },
} as const;

export const breakpoints = {
  sm: 680,
  md: 960,
} as const;
