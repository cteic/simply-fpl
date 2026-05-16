# SKILLS — Animations

Project-specific animation conventions. Read alongside `packages/ui/DESIGN_SYSTEM.md`.

## Source

These conventions are grounded in [animations.dev](https://animations.dev) by Emil Kowalski (Design Engineer at Linear). Our visual identity is explicitly Linear-inspired, so the principles taught there are the right north star. When the rules below aren't enough for a specific decision, defer to that course.

## Philosophy

Animation is purpose-driven. It directs attention, reveals state changes, and confirms interaction. It does not entertain.

The bar isn't "does it work" — it's "does it feel right." A motion that's functionally correct but timed wrong or eased wrong actively damages the product. When in doubt, omit the animation. A still page that loads fast beats an animated page that ships slow.

## Hard rules

### Easing

- **Entrances**: `ease-out`. Element decelerates as it arrives — feels confident, like it always knew where to land.
- **On-screen state changes** (expand, collapse, move): `ease-in-out`. Element accelerates, then decelerates — feels intentional.
- **Exits**: `ease-in`. Element accelerates as it leaves — feels urgent.
- **Never linear** except for indeterminate progress indicators.
- Prefer named custom cubic-beziers from animations.dev over the browser defaults — they're tuned for "feel." Add a chosen curve to `packages/ui/tamagui.config.ts` rather than redefining inline.

### Duration

- 120ms–1200ms range. Anything outside that range needs justification in the PR.
- Micro-feedback (hover, focus, press): ~120ms — `fast`
- State changes (expand/collapse, tab switch): ~250ms — `medium`
- New surface entrances: ~350ms — `slow`
- Progress bars / rank counter: 1200ms — `bar`

### Properties

- Animate **`transform`** and **`opacity` only**. Both are GPU-accelerated and don't trigger layout.
- Never animate `width`, `height`, `top`, `left`, `padding`, `margin`. They thrash the main thread and cause CLS.
- Layout transitions (height auto → 0) should be re-expressed as `transform: scaleY()` or a fixed-height crossfade.

### Spring physics

- **Yes** for genuinely physical interactions: drag-to-reorder, swipe-to-dismiss, pull-to-refresh.
- **No** for UI chrome (modals, tabs, dropdowns). Springs there feel toy-like and out of brand.

### Accessibility

- Respect `prefers-reduced-motion: reduce`. Decorative animations collapse to a fade or no transition. Functional indicators (loading, progress) may keep moving.
- The CSS media query and Tamagui's reduced-motion hook should both be honoured — pick one consistently per surface and document.

### Cross-platform

- Define animations once via Tamagui primitives. They work on web and native. Never duplicate.
- Test new animations on both web (Chrome + Safari) and a mobile viewport before merging.

### Performance budget

- A new animation must not push `/rank/[entryId]` first-load JS above 100KB gz.
- If a library adds >5KB just for one effect, find another approach.

## When to animate

- **Data freshness pulse** — the live "•" indicator confirming data is current.
- **Optimistic state confirmation** — a row that just moved up the table briefly highlights, then settles.
- **Tab / surface transitions** — fade or short slide between related views.
- **Skeleton → real content** — fade, never pop.
- **Toast / notification entry-exit** — slide in from edge, fade out.

## When NOT to animate

- Initial page load (after skeleton). Just render.
- Scroll-linked effects. The page must feel native and predictable.
- Decorative micro-interactions (button "bounce" on hover etc.). Not our brand.
- Anything that delays the first display of FPL data. Latest data first is the wedge.

## Named primitives

Use Tamagui's animation system (`animation`, `enterStyle`, `exitStyle`, `useAnimatedNumber`). Drivers are configured in `packages/ui/tamagui.config.ts`. Standard named animations:

- `fast` — 120ms timing — for hover/focus/press feedback
- `medium` — 250ms timing — for state changes (expand/collapse, tab switch)
- `slow` — 350ms timing — for entrance of a new surface
- `bar` — 1200ms timing — for progress bars and the rank counter

These primitives are timing-only (`type: 'timing'`, no built-in easing). The Easing rules above are applied separately via the transition / CSS layer.

Add a new named animation only when an existing one doesn't fit. Don't define inline timing values across the codebase.

## Anti-patterns

- **Array-shaped style props** on DOM elements (`style={[...]}`). Caused the 2026-05-15 prod crash. Tamagui v2 extraction can emit them; check the compiled output if anything visual changes.
- **Animating layout properties** instead of transforms (see Properties above).
- **Stacked animations on the same element** — pick one. Multiple competing transitions are a debugging nightmare.
- **Spring physics for UI chrome** — see Spring physics above.
- **CSS keyframes outside the design system** — go through Tamagui so the animation respects reduced-motion and stays consistent across web/native.
- **"Cute" easings on data surfaces** — bounce, elastic, anticipate. The product is information-first; these break the contract.

## Adding a new animation

1. Decide if it fits the **When to animate** list. If not, push back.
2. Pick the right easing for the motion type (entrance / state / exit).
3. Use one of the named primitives above. If a new one is genuinely needed, add it to `packages/ui/tamagui.config.ts` and document it here.
4. Verify on web (Chrome + Safari) and a mobile viewport.
5. Run Lighthouse against the changed page — confirm CLS hasn't regressed.
6. Add a visual regression scenario in `apps/web/e2e/features/` covering the new state (entrance + settled). The `pageerror` assertion catches array-style regressions.
