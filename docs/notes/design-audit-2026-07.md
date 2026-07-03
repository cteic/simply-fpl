# Design audit — July 2026

Brief: "super slick with cutting edge animations, but super fast." This document audits the current design execution against the design system, then offers three upgrade directions with animation specs, performance budgets, and effort estimates. A small taster of the recommended direction ships in the same PR (motion tokens + StatTile value-pulse).

## Part 1 — Audit

### What's strong

- **The identity core holds.** Warm neutral canvas, DM Mono for every data value, borders-not-shadows, and the tokenised stadium gradient on hero surfaces give the product a recognisable temperature that neither LiveFPL (dark, dense, 2014-forum energy) nor generic dashboard templates have. The `tone="stadium"` heroes against the quiet body is a genuinely good editorial rhythm.
- **Tokenisation discipline is real.** `$stadium*`, `$inverse*`, `$overlay*` scales mean surface-level restyling is cheap; the vibrant-stadium pass (StatTile tones, PitchField) landed without bespoke hex in components.
- **Motion already exists where it matters most.** NumberTicker easing rank changes, the FLIP hook reordering rivals rows, LivePill's freshness dot, provisional-bonus shimmer — the _concepts_ are right: motion tied to data change, not decoration.

### What's inconsistent

1. **Four disconnected motion systems.** Tamagui animations (`tamagui.config.ts` — RN driver, timing-only), raw CSS keyframes (`apps/web/src/app/globals.css` — `sfPulse`, `sfShimmer`, `sfFadeUp`, web-only), a hand-rolled rAF loop (`number-ticker.tsx`), and a DOM-level FLIP hook (`use-flip-animation.ts`). Durations and easings are re-declared in each (120/250/350/1200ms in config; 700ms default in NumberTicker; 250ms in FLIP; ad-hoc curves). There is no single motion vocabulary — which is why the app feels _animated in places_ rather than _choreographed_.
2. **`prefers-reduced-motion` is honoured exactly once** (the FLIP hook). NumberTicker, the CSS keyframes, and Tamagui-driven transitions ignore it. Accessibility gap and a perf lever left unpulled.
3. **Bespoke hex has crept back into views.** `live-rank-real-view.tsx` hero uses `color="#FFFFFF"` and `backgroundColor="#34D399"` where `$inverse` / `$stadiumAccentStrong` exist. Small, but it's the exact drift the token system was built to prevent.
4. **The web animation driver is the React Native one.** `@tamagui/animations-react-native` runs timing animations on the JS thread via RN-Web's Animated. Every Tamagui `animation=` transition costs main-thread work that CSS transitions would hand to the compositor. This caps how much motion the app can afford — the opposite of the brief.
5. **The documented Tamagui animation path doesn't actually compile.** DESIGN_SYSTEM.md says "apply via `animation=` prop", but under the pinned `tamagui@2.0.0-rc.42` the `animation`/`enterStyle` props are absent from styled-component types — `Property 'animation' does not exist`. Zero usages exist in the repo, which is why nobody noticed: the `animations` block in `tamagui.config.ts` is effectively dead code today. Every animation that ships (ticker, FLIP, keyframes) routes around Tamagui. Resolving this (RC upgrade or the CSS-driver switch below) is a prerequisite for any Tamagui-native motion work.

### What reads generic

- **Enter states.** Views largely pop in fully-formed (sfFadeUp exists but is sparsely used). One orchestrated, staggered first paint per view is the single highest-leverage "slick" signal and we don't have it.
- **Timing-only easing.** Everything is linear-duration timing; nothing overshoots, settles, or springs. Cutting-edge feel in 2026 is mostly _easing character_, not more animation.
- **Score moments are silent.** A captain haul, a goal for your differential, provisional bonus confirming — the emotional peaks of the product render as a plain re-render. LiveFPL is equally silent here; this is an open flank.

## Part 2 — Three directions

### Direction A — Broadcast Grade (recommended)

**Concept.** The app behaves like a live match graphics package: every pixel that moves does so because data changed, with one shared motion vocabulary. Think Sky Sports score bug meets Linear's restraint — kinetic when the game is, silent when it isn't.

**Mood.** Calm surface, electric moments.

**Concrete changes**

1. `packages/ui/src/theme/motion.ts` — canonical motion tokens: durations (reuse 120/250/350/1200), named easings (`easeOutQuart`, `easeOutBack` for settle-with-character, `linear` for progress), and a `useReducedMotion()` hook consumed by every animated component. _(shipped in this PR's taster)_
2. **StatTile value-pulse** — on value change, a 350ms pulse (scale 1→1.012→1 + tone-coloured overlay fading out) driven by a reusable `usePulse` hook. Ranks/points tiles visibly "receive" data. Implemented rAF-based (the NumberTicker idiom) because of finding 5 above — it migrates to Tamagui/CSS transitions for free once the driver question is settled. _(shipped in this PR's taster, wired to the live-rank tiles)_
3. **Score-flash on `Player` badges** (`packages/ui/src/components/player`) — when a player's points increment mid-gameweek, badge does a 300ms `easeOutBack` scale-settle with a brief `$positiveBg` wash; red for negative events. This is the "your captain just scored" moment made visible.
4. **Provisional→confirmed bonus transition** — replace the static provisional marker with a shimmer that _stops and solidifies_ (opacity crossfade, 250ms) when bonus confirms. Communicates the FPL-specific anxiety point without a single word.
5. **Rank hero choreography** (`live-rank-real-view.tsx`) — one staggered entrance per load: gradient fades in (350ms), rank ticks up via NumberTicker, movement chip slides in 40ms later, tiles stagger 30ms apart. Ties existing pieces into a sequence instead of simultaneous pop-in.
6. **FLIP everywhere rows reorder** — the rivals FLIP hook generalised into `packages/ui` and applied to league tables and h2h swing moments (currently rivals-only).
7. **Unify NumberTicker onto the motion tokens** and honour reduced-motion (jump straight to value).
8. **Fix the hero's bespoke hex** → `$inverse` / `$stadiumAccentStrong` (5-minute change, belongs to whichever PR touches the file first).

**Animation spec.** All state-change animations 250–350ms; entrance stagger steps 30–40ms; easings `easeOutQuart` (data settling) and `easeOutBack` (celebratory moments only — score flash, rank-up chip); nothing loops except the existing LivePill dot (1.5s) and shimmer while provisional. Every trigger is a data delta — no scroll-triggered or hover-triggered theatrics on the live surfaces.

**Performance budget.** Transform/opacity only — the pulse overlay and score-flash are absolutely-positioned layers, no layout properties animated; FLIP is transform-based by construction. Zero new dependencies (motion.ts is ~1.5 kB source; no runtime lib). The taster's pulse is rAF-state-driven for now (finding 5), which costs re-renders of one leaf component for 350ms per data change — the same budget NumberTicker already spends every tick, bounded and event-driven. NumberTicker itself gains a reduced-motion bypass in item 7. `/` first-load impact: ≤0.5 kB gz (verified against the 210 kB budget in this PR). 60fps on mid-range mobile holds because nothing forces layout/paint; will-change is unnecessary at these layer counts. **Follow-up with real headroom:** switch the _web_ Tamagui driver to `@tamagui/animations-css` (config `.web.ts` split) so every `animation=` prop becomes a compositor CSS transition — moves all Tamagui transition work off the JS thread and drops the RN Animated runtime from the web bundle. Tamagui-family package, not a new styling library; needs its own PR + visual regression pass.

**Effort.** Foundation + taster: this PR. Items 3–8: ~3–4 days. Driver switch: +1 day incl. visual snapshots.

### Direction B — Quiet Luxury

**Concept.** Refuse the arms race: make SimplyFPL the _calmest_ FPL tool, where quality lives in typography, spacing, and 120ms-crisp micro-interactions rather than motion. Linear's discipline taken further than Linear.

**Mood.** A broadsheet's sports desk, not a stadium.

**Concrete changes**

1. Typography pass: push page titles from 21 → 26–28pt DM Sans 600 with tighter tracking; hero numbers stay mono but gain optical size contrast (56 → 64pt on desktop); meta rows drop to `$colorSubtle` uniformly.
2. Spacing normalisation: audit the loose scale usage — several views mix 12/14/16px gaps in one column (`leagues-showcase.tsx`, cohort card); settle on 12/20/32 rhythm.
3. One brand-wide easing curve (`cubic-bezier(0.22, 1, 0.36, 1)`) applied to ALL hover/press/focus via Tamagui config; delete the CSS keyframes except shimmer.
4. Hover states with intent: cards lift 1px translate + border darkens (no shadows, consistent with system); table rows get a 120ms background wash.
5. Focus-visible treatment: 2px `$brand` ring, offset 2px — currently browser-default.
6. Kill all ambient motion except LivePill; NumberTicker duration drops to 400ms.
7. Empty/loading states redrawn as typographic moments (large mono em-dash, one-line explanation) instead of skeleton grids everywhere.

**Animation spec.** 120ms hover/press, 250ms view transitions, single easing curve, zero loops beyond LivePill. Reduced-motion = identical experience minus the 250ms transitions.

**Performance budget.** Strictly negative cost — removes keyframes and rAF work; bundle shrinks slightly. The fastest option by construction.

**Effort.** ~2–3 days. Risk: forfeits the "wow" ask — this direction wins on taste, not spectacle.

### Direction C — Stadium Maximal

**Concept.** The stadium identity stops being a hero accent and becomes the world: the user's own club colours theme their experience, surfaces feel floodlit, and big FPL moments get full-card celebrations. The product becomes _their_ ground.

**Mood.** Walking out of the tunnel, every session.

**Concrete changes**

1. Club-colour theming: derive an accent scale from the user's FPL team (`getClubColor` already exists in fpl-client) and thread it through `$stadiumAccent` overrides — every user's app is subtly _theirs_.
2. Stadium surfaces site-wide: leagues and h2h page headers adopt `tone="stadium"`; the cohort card gets the pitch-stripe overlay treatment from `stadiumHeroGradient`.
3. Goal-moment celebration: when your player scores, a 600ms diagonal light-sweep crosses the live-rank card (single overlay, transform-driven) + score-flash on the player. One per event, queued, max one visible.
4. Deadline countdown treatment: final hour gets the `defcon-bar` promoted to a sticky, gently-breathing (opacity 0.9↔1, 2s) presence.
5. Theme picker (`ThemePicker` exists, auth-gated) promoted to the nav for everyone — Stadium / Bold / Quiet become user-facing brand.
6. Dark "floodlit" theme variant built from the existing `$stadium3/4` stops — the night-match mode.

**Animation spec.** Celebrations 600ms `easeOutQuart`, light-sweep transform-only; ambient breathing limited to two elements max app-wide; everything else inherits Direction A's data-delta rules.

**Performance budget.** Heavier: gradient layers on more surfaces (paint cost on low-end mobile), a theming context re-render risk, and celebration overlays. Achievable within 60fps if sweeps are single-layer transforms, but this direction _spends_ the headroom A creates. Bundle +1–2 kB. Needs the CSS driver switch first as an enabler.

**Effort.** ~5–7 days after Direction A's foundation. Highest memorability, highest risk of undermining the "fast + clean" positioning if overdone — recommend gating celebrations behind a "match-day effects" toggle.

## Recommendation

**A now, C's best single idea later.** Direction A is the only one that directly serves both halves of the brief — its animations are _information_, so they justify their cost, and its foundation (motion tokens + reduced-motion + compositor discipline + CSS driver follow-up) makes the app measurably faster than today even with more visible motion. After GW1 launch, lift Direction C's club-colour accent (item 1) as the retention hook — it's the most memorable idea in this document and slots cleanly onto A's foundation.

The taster in this PR ships Direction A's items 1–2 so the feel is judgeable in the product, not in prose.
