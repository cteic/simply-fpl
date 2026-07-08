# RTL Layout Audit (Arabic / `ar` locale pre-check)

**Date:** 2026-07-08
**Scope:** `apps/web` + `packages/ui` components reviewed against LTR assumptions. No ar locale files or `dir="rtl"` code exists yet — this is a planning document only.

---

## How RTL would be wired

Arabic requires `<html dir="rtl">` (or per-subtree `dir="rtl"`) and a corresponding CSS logical-property pass. Tamagui uses inline styles derived from its token system, so RTL support depends on:

1. Setting `dir` on the root element — controlled in `apps/web/src/app/layout.tsx`.
2. Replacing directional CSS values (`left`/`right`, `margin-left`, `padding-right`, `border-left`, `transform: translateX(+n)`, `flex-direction: row`) with CSS **logical properties** (`inline-start`/`inline-end`, `margin-inline-start`, etc.) or Tamagui equivalents — Tamagui does **not** automatically mirror directional styles when `dir="rtl"` is set.
3. Any `rotate`, `translate`, or icon transform that implies directionality (arrows, chevrons) must be mirrored explicitly.

---

## Component inventory — breaking / at-risk under RTL

### High-effort breaks (layout inversion required)

| Component / location | Issue | Effort |
|---|---|---|
| `packages/ui/src/components/pitch/` — pitch layout | Goalkeeper → defenders → midfielders → forwards rendered top-to-bottom; `XStack` rows use positional slot indices. RTL flips left/right within a row, so formation columns swap (GK still centred, but left-back and right-back swap visually). May be acceptable for FPL since positions are conceptual, not screen-side. | Low–medium — visual swap may be fine or need a mirror flag. |
| `packages/ui/src/components/league-table/` — rank column | `league_table.col_manager` text aligns left; numeric rank column aligns right. RTL should mirror to rank left, manager right. | Medium — requires logical `text-align` on the two columns. |
| `packages/ui/src/components/live-battle/` — gains/losses split | `XStack` of two panels; gains on left, losses on right. RTL would swap them visually. The semantic meaning is unaffected but may surprise users. | Low — confirm swap is acceptable or add explicit `direction="ltr"` guard. |
| `apps/web/src/components/nav/` — top nav | Logo left, nav links right. Tamagui `XStack` with `justifyContent="space-between"` will correctly mirror under RTL because space-between is direction-agnostic. Arrow glyphs (`→`) in link text like `leagues.cta_view_rivals` will need translating to `←` for ar. | Low — glyph swap in ar.json. |
| `packages/ui/src/components/notifications-settings/` — quiet-hours time display | `00:00 – 23:00 UTC` string is constructed with template literals; direction-neutral, renders fine under RTL. The toggle layout (`XStack justifyContent="space-between"`) will mirror correctly. | None. |

### Medium-effort breaks (icon / arrow mirroring)

| Location | Issue | Effort |
|---|---|---|
| Arrow glyphs in translation strings (`→` in `leagues.cta_view_rivals`, `team_id_help.open_fpl`) | Hardcoded Unicode arrows are LTR by convention. ar.json would need `←` variants. | Low — key already exists, just translate differently. |
| Chevron icons in `packages/ui/src/components/` (breadcrumb, back buttons, carousel) | SVG chevrons that aren't Unicode text need `transform: scaleX(-1)` under RTL. Tamagui doesn't auto-apply this. | Medium — wrap icon in an RTL-aware component or use `dir`-conditional style. |
| `packages/ui/src/components/locale-switcher/` pill row | `XStack` of pill buttons reads left-to-right across locales. Under RTL the visual order reverses. Semantically fine but locale labels may render in an unexpected order. | Low — acceptable or add `dir="ltr"` to force consistent pill order. |

### Low / no effort (already direction-safe)

| Location | Reason |
|---|---|
| `YStack` column layouts (settings sections, pref toggle list) | Vertical only; unaffected by RTL. |
| Number / price displays (`formatPrice`, points, rank integers) | FPL data is numeric; Arabic-Indic numerals are an optional enhancement, not required for readability. |
| Modal / sheet overlays | Tamagui Sheet anchors to bottom; unaffected. |
| Fonts (DM Sans, DM Mono) | These fonts lack Arabic glyphs entirely — a proper ar implementation would need a fallback Arabic font stack (e.g. Noto Sans Arabic). |

---

## Additional considerations for an ar implementation

- **Font**: DM Sans/DM Mono have no Arabic coverage. A separate Arabic font (Noto Sans Arabic or Cairo) would be needed, loaded lazily for the ar locale only.
- **Numbers**: FPL rank/price data stays in Western Arabic numerals (0–9) — this is standard across FPL-playing Arabic markets and avoids a numeral conversion layer.
- **Tamagui RTL gap**: Tamagui's compiled CSS-in-JS does not automatically apply CSS logical properties. Every directional style (`marginLeft`, `paddingRight`, `left`, `right`, `borderLeft`) added in a new component should use logical equivalents (`marginInlineStart`, etc.) to stay RTL-safe from the start.
- **`dir` propagation**: Setting `dir="rtl"` on `<html>` is sufficient for browser text-rendering fallback, but Tamagui's `<TamaguiProvider>` does not read `dir` from the DOM. An RTL-aware token theme or a manual direction context would be required.
- **Lazy locale loading**: The existing `loadLocale` pattern handles ar lazily the same as fr/de/es/ru/zh/ja — no architecture changes needed.

---

## Effort estimate

| Category | Story points (rough) |
|---|---|
| Locale file (ar.json — 144 keys, native Arabic speaker review) | 3 |
| Wire ar into loadLocale + registry + parity spec | 0.5 |
| Font loading (Noto Sans Arabic lazy bundle) | 1 |
| Logical-property audit + fix across `packages/ui` | 5 |
| Arrow/chevron icon mirroring | 2 |
| `dir="rtl"` root wiring + Tamagui direction context | 2 |
| QA / visual regression across all routes | 3 |
| **Total** | **~16.5 pts** |

**Recommendation:** ar is a meaningful addition for GCC FPL markets but is a genuine engineering sprint, not a wave-3 file drop. The highest-risk item is the Tamagui logical-property gap — it requires auditing every directional style in `packages/ui` before the locale goes live. Deferred to post-launch unless there is a specific partnership or market reason to prioritise it.
