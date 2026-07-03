# League-table design — settling the open decisions

Settles the five open decisions in #113 so RV-04 and a future `/leagues/[id]`
page share one design language for live league / rivals tables. Scope here is
**design + presentational component groundwork**, not live data wiring or the
OR/REM/captain fan-out (RV-03, RFC 001 — out of scope).

The north star: beat LiveFPL's "Detailed View" on clarity. They have the
density but their detail row is denser than the headline row, the eye has
nowhere to land, and strikethrough transfers cost effort to parse. We win by
keeping the compact row calm and pushing the density behind a tap.

Everything below is **mobile-first** — the mini-league-heavy user checks their
phone at 3pm on a Saturday. Web inherits the same component and only relaxes
constraints where the extra width is genuinely free.

---

## 1. Compact vs Detailed toggle — _pick one default and commit_

**Decision:** No global Compact/Detailed toggle. Ship a single compact row with
**per-row progressive disclosure** (decision 2). The "row state" is local, not a
page-wide mode.

**Rationale:** LiveFPL's toggle — and their "switch to old design" banner — is a
tell that they shipped without conviction and made the user do the editorial
work. A mode switch is global state to persist, a second layout to maintain and
test, and a decision we push onto the user every visit. One calm default that
expands on demand gives the density to those who want it without taxing those who
don't. If telemetry later shows power users living in the expanded state, we
revisit a "keep all rows expanded" preference — but that is a stored preference,
not a separate design.

---

## 2. Progressive disclosure on tap vs always-on rich rows — _tap to expand_

**Decision:** Compact row is always visible; the detail (captain breakdown,
transfers, bench waste, played ratio) is revealed by **tapping the row**. On web,
the same row also expands on tap (not hover) so the interaction is identical
across platforms and discoverable on touch; hover only previews affordance (a
subtle background shift + a chevron).

**Rationale:** Mobile cannot afford always-on rich rows — five rich rows already
fill the viewport and the eye drowns. Tap-to-expand keeps the scannable list
intact and lets the user drill exactly where they're curious. Choosing tap over
hover even on web keeps one mental model and one set of step definitions; a
hover-only reveal is invisible to the majority of weekend traffic (touch).

- Only the user's own row MAY default to expanded (see decision 4) — everyone
  else starts collapsed.
- Expansion is animated with the existing `fast`/`medium` tokens; no layout jump.
- State is per-row and ephemeral (component `useState`); we do not persist which
  rows were open.

---

## 3. Inline transfers — _expanded detail only_

**Decision:** Transfers (out / in + hit) live in the **expanded detail**, never
in the compact headline row. The compact row surfaces the transfer _cost_ only,
as a small `-4` hit pill next to the manager name, so the scan still flags "this
manager took a hit" without spelling out who moved.

**Rationale:** Transfer names are the densest, least-scannable payload in
LiveFPL's row and the main reason their detail row reads as noise. The hit is the
decision-relevant signal at a glance; the names are detail you want only when you
tap in. This keeps the headline row to one line on a phone.

Notation: **no strikethrough.** Render as two labelled segments —
`out: Bowen` / `in: Welbeck` — with the hit as a quiet `(-4)`. Out is muted, in
is primary text, so direction reads from weight, not from a line through a name.

---

## 4. Sticky user row — _highlight always; sticky on web only, deferred_

**Decision:** The user's row is **always visually distinct** (tinted background +
left brand border + a `You` tag) regardless of position. A sticky-on-scroll
treatment when the user is mid-table is **web-only and deferred** — not part of
this component's first cut. On mobile the answer is "scroll to me", not "pin me".

**Rationale:** Highlight is cheap, cross-platform, and solves 90% of "where am I"
instantly. Sticky positioning is fiddly on mobile (it eats vertical space the
small viewport can't spare and fights the native scroll), and `position: sticky`
behaves differently inside scroll containers across platforms. For rivals (RV-04:
2 above + 2 below the user) the user is always on screen anyway, so sticky earns
nothing there. We add a "jump to my row" affordance for large leagues instead,
and only consider true sticky once a real long-league surface needs it.

---

## 5. Differential players — _full panel (RV-04), not inline icons_

**Decision:** Differentials are **not** rendered as icons inside the league row.
They live in the dedicated differentials panel already specified by RV-04 (and the
existing `DifferentialsPanel` component). The row stays about standings; the panel
answers "who do they own that I don't."

**Rationale:** Inline differential icons reintroduce exactly the per-row noise we
just removed in decisions 2–3, and they only make sense relative to _one_ baseline
(the user), which doesn't generalise to a full league table where every pair has a
different differential set. Keeping differentials in a panel keeps the comparison
explicit and the table calm, and avoids duplicating ownership logic per row.

---

## Resulting component contract

`DetailedLeagueRow` (presentational, `packages/ui`) — driven by typed props
(`DetailedLeagueRowData` in `packages/types`), mock data only, no fetching:

- **Compact row (always on):** position, manager name, team name, active-chip
  pill (quiet), `-N` hit pill when a hit was taken, GW score (with
  `gross (-hit) = net` when relevant), total points, expand chevron. The user's
  row is highlighted.
- **Expanded detail (tap):** captain cell showing `name (C|TC) · points ×
multiplier`; a bench-waste line shown **only when non-zero**; transfers as
  `out: … / in: … (-hit)` with no strikethrough; `13/18 played` ratio.

Out of scope here and tracked elsewhere: tanstack-table / bundle choice, the
OR/REM/captain data fan-out, and live-data freshness.
