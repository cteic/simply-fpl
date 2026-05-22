# SimplyFPL Design System

Tamagui-based design system for SimplyFPL. Source of truth for visual identity across web (Next.js) and native (Expo). Always read this file before building or modifying UI components.

## Reference

- **Visual prototype:** `apps/web/design/simplyfpl-demo.html` — interactive HTML demo with all four views
- **Tamagui config:** `packages/ui/tamagui.config.ts` — token registration
- **Token source:** `packages/ui/src/theme/` — colours, spacing, typography
- **Architecture inspiration:** [leather-io/mono](https://github.com/leather-io/mono)

## Design philosophy

Linear.app-inspired — quiet, dense, information-first. Warm neutral light theme (not stark white, not dark). Numbers and rank data treated with monospace typography for credibility. Animations are subtle (200ms-1.2s, eased).

The base canvas favours **clarity over decoration**. Every visual element earns its place: borders separate, colour signals state, monospace fonts mean "this is data."

### Stadium direction

A small set of **hero surfaces** break the quiet rule on purpose: the landing hero, page headers (`tone="stadium"`) and the live-rank card render on a teal "matchday" gradient with mint accents and inverse (white-on-teal) text. This is the product's identity moment — it should feel like walking out into a floodlit ground — while everything below stays calm and data-first.

The stadium look is **fully tokenised** (see below): there are no bespoke hex values in components. To put any surface on the stadium look, reach for the `stadium*` / `inverse*` / `overlay*` tokens and the shared `stadiumGradient` rather than re-deriving colours.

## Token reference

All tokens are defined in `packages/ui/src/theme/`. In Tamagui components, reference them via `$` prefix.

### Colours

Surface tokens:

- `$background` (#F7F7F5) — page bg, warm off-white
- `$surface` (#FFFFFF) — card bg
- `$border` (#E9E8E4) — default borders, dividers
- `$borderStrong` (#D5D4CF) — pill outlines, input borders

Text tokens:

- `$color` (#1A1A18) — primary, alias `$t1`
- `$colorMuted` (#6B6B63) — secondary, alias `$t2`
- `$colorSubtle` (#A8A8A0) — tertiary, alias `$t3`

Semantic tokens:

- Positive: `$positive`, `$positiveBg`, `$positiveBorder`
- Negative: `$negative`, `$negativeBg`
- Warning: `$warning`, `$warningBg`, `$warningBorder`
- Info: `$info`, `$infoBg`

Brand tokens (mono lockup wordmark + `s.` favicon):

- `$brand` (#0F766E) — deep teal, used for the period in `simply.fpl` and the `s.` mark; sparingly elsewhere
- `$brandHover` (#115E59) — one step darker for hover/press
- `$brandBg` (#F0FDFA) — tinted bg for future use (badges, callouts)

Brand sits outside the semantic group — it's identity, not state.

Stadium tokens (teal gradient surfaces + inverse content):

- `$stadium1`–`$stadium4` (#1A8A6E → #0F766E → #0B4F49 → #082E2A) — gradient stops, brightest → darkest. `$stadium2` equals `$brand`.
- `$stadiumAccent` (#5EEAD4) / `$stadiumAccentStrong` (#34D399) — mint accents on the teal field (eyebrow, CTA, sparkline, accent headline word)
- `$stadiumDanger` (#FCA5A5) — error text legible on teal
- Inverse text ladder, for any dark teal surface: `$inverse` (white), `$inverseStrong` (.8), `$inverseMuted` (.72), `$inverseSoft` (.55), `$inverseFaint` (.4)
- Overlay scale, white fills/borders/tracks on teal, faint → strong: `$overlay1` (.06), `$overlay2` (.1), `$overlay3` (.12), `$overlay4` (.18), `$overlay5` (.28), `$overlay6` (.45)

The gradient itself is **not** copied per-component. Import the shared definition from `@simplyfpl/ui` (or `@simplyfpl/ui/theme`):

- `stadiumGradient` — canonical radial used by `PageHeader tone="stadium"` and the live-rank card
- `stadiumHeroGradient` — `stadiumGradient` plus a faint pitch-stripe overlay, used by the landing hero

Both compose the `$stadium*` stops, so changing the palette updates every surface at once. SVG `fill`/`stroke` (which can't read Tamagui tokens) should import the raw `colors.stadiumAccent` etc. from `@simplyfpl/ui/theme`.

Raw tokens (for non-themed contexts like FDR scale, position shirts) are exported from `@simplyfpl/ui/theme` as plain values.

### Typography

Two font families, both must be loaded (use `expo-font` on native, `next/font/google` on web):

- `$body` — DM Sans (300/400/500/600/700)
- `$mono` — DM Mono (300/400/500)

DM Mono is used wherever a value is "data": ranks, points, prices, percentages, team IDs, gameweek labels, FDR scores. **Non-negotiable** — it's the strongest visual signal in the system.

Size scale (in `$body`):

- `$1` (9pt) — tiny meta, progress labels
- `$2` (10pt) — section labels (uppercase)
- `$4` (11pt) — secondary meta
- `$7` (12pt) — buttons
- `$8` (12pt) — body, table data
- `$11` (13pt) — card headings
- `$13` (21pt) — page titles
- `$14` (30pt) — stat hero numbers (use with `$mono`)

### Spacing

Loose scale, pragmatic rather than strict 4/8 grid. Common values: `$1`–`$16` mapping to `4px`–`80px`.

Page max-width: `$page` (960px). Mobile padding shifts at `$sm` breakpoint (680px).

### Radii

- `$2` (4px) — delta chips, FDR squares
- `$3` (6px) — buttons, nav links, inputs (was `--rs`)
- `$5` (9px) — shirts
- `$6` (10px) — cards, panels (was `--r`)
- `$7` (20px) — pills

## Component patterns

### Tamagui primitive choice

Default to these primitives, in order of preference:

1. `<XStack>` — horizontal flex container
2. `<YStack>` — vertical flex container
3. `<Stack>` — generic container (no flex direction)
4. `<Text>` — all text content
5. `<ScrollView>` — scrollable areas

Avoid raw `<View>` and `<Text>` from `react-native`. Tamagui's primitives extend them with token support and the compiler optimisations.

### Component file structure

Each component lives in its own folder under `packages/ui/src/components/`:

```
components/
  live-pill/
    live-pill.tsx        ← implementation
    live-pill.test.tsx   ← tests (when worth writing)
    index.ts             ← re-exports
```

The folder name and component name are kebab-case for files, PascalCase for the export.

### Variant pattern

Use `styled()` with variants instead of prop branching in JSX:

```tsx
const Container = styled(XStack, {
  borderRadius: '$7',
  variants: {
    tone: {
      positive: { backgroundColor: '$positiveBg', borderColor: '$positiveBorder' },
      warning: { backgroundColor: '$warningBg', borderColor: '$warningBorder' },
    },
    size: {
      sm: { paddingHorizontal: 9, paddingVertical: 3 },
      md: { paddingHorizontal: 14, paddingVertical: 6 },
    },
  } as const,
});
```

This unlocks Tamagui's compile-time optimisations and gives consumers strict prop types automatically.

### Animation tokens

Defined in `tamagui.config.ts`:

- `fast` — 120ms (button hovers, transitions)
- `medium` — 250ms (card hovers, focus states)
- `slow` — 350ms (page entry, fadeUp)
- `bar` — 1200ms (progress bars, rank counter)

Apply via `animation="fast"` prop. Combine with `enterStyle`, `exitStyle`, `pressStyle`, `hoverStyle` for state transitions.

## Component inventory

Built and reusable:

- `LivePill` — the signature "GW30 Live" indicator with pulsing dot

To build (in priority order):

1. `Button` — primary/ghost variants, three sizes
2. `Nav` — sticky header with logo, links, live pill, auth buttons
3. `PageHeader` — title + meta + right-side action
4. `StatRow` + `StatCard` — three-column stat display with monospace values
5. `Card` — generic surface container (header + body slots)
6. `TeamPill` — team ID selector pill
7. `LeagueTable` — sortable rows with "you" highlight
8. `PriceRow` — animated horizontal bar with probability chip
9. `FilterButton` — pill-shaped toggle (single-select group)
10. `PlannerGrid` + `PlannerCell` — 5-column gameweek grid with FDR badges
11. `Pitch` + `Player` — formation view with shirt SVGs
12. `Input` — text input matching prototype style

Domain-specific (built when needed for a feature):

- `Shirt` — SVG shirt graphics with position colouring
- `FdrBadge` — coloured difficulty rating square
- `PointsBadge` — captain/triple-captain/bench badge variants
- `Logo` — the SimplyFPL logomark

## Web / native differences

Most components are unchanged across platforms. A few cases need attention:

| Pattern         | Web                          | Native                                       |
| --------------- | ---------------------------- | -------------------------------------------- |
| Sticky nav      | `position: 'sticky'` works   | Use a top-anchored header in stack navigator |
| Backdrop blur   | `backdropFilter: blur(18px)` | Not supported — fall back to opaque bg       |
| `:hover` states | Use `hoverStyle`             | Inert (no hover on touch)                    |
| Cursor          | Use `cursor` prop            | Inert                                        |
| SVG             | Native HTML SVG              | `react-native-svg` (Expo includes it)        |

Tamagui handles most of these automatically. `hoverStyle` simply does nothing on native — no platform-specific code needed.

## Loading fonts

### Web (`apps/web`)

```tsx
// app/layout.tsx
import { DM_Mono, DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
});
const dmMono = DM_Mono({ subsets: ['latin'], variable: '--font-dm-mono', weight: ['400', '500'] });
```

### Native (`apps/mobile`)

```tsx
// app/_layout.tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
  'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
  'DMSans-SemiBold': require('../assets/fonts/DMSans-SemiBold.ttf'),
  'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
  'DMMono-Regular': require('../assets/fonts/DMMono-Regular.ttf'),
  'DMMono-Medium': require('../assets/fonts/DMMono-Medium.ttf'),
});
```

The font face names in `tamagui.config.ts` (`DMSans-Regular` etc.) must match the loaded names.

## Implementation order

When a feature requires new components, build them in this order:

1. **Foundation:** confirm tokens render correctly (build a smoke-test page if needed)
2. **Nav** — visual identity locks in here
3. **Page wrapper** + page header pattern
4. **Stat row / stat card** — most reused pattern in app
5. **Generic card** — header + body slot
6. **Live Rank view** end-to-end (combines everything above + pitch)
7. Other views as needed for features

For each component, give Claude Code one focused task referencing this doc and the prototype HTML. Don't ask it to "implement the design" — ask it to "implement the StatCard component matching the Live Rank stat row in the prototype, using Tamagui primitives and tokens from `@simplyfpl/ui/theme`."

## When mobile is added

The token consumption for React Native StyleSheet:

```ts
import { StyleSheet } from 'react-native';

import { colors, radius, space } from '@simplyfpl/ui/theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius[6],
    padding: space[5],
  },
});
```

But — prefer Tamagui primitives over raw StyleSheet wherever possible. Direct token import is the escape hatch, not the default. Components in `packages/ui` work cross-platform out of the box; only reach for raw StyleSheet if Tamagui genuinely can't express what you need.
