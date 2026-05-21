# Redesign demos

Standalone HTML mockups exploring a redesign of the home experience. Each demo
shows **two states**:

1. **Landing — no team:** the pre-team marketing view.
2. **Dashboard — with team:** a consolidated, above-the-fold view that brings
   the live rank, key stats, and pitch together.

Use the toggle at the top of each page to switch states, and resize the window
(or open dev-tools device mode) to see the mobile layout.

## Open

- Index / chooser: `/design-demos/demo-redesign-index.html`
- A — Two-State Bold: `/design-demos/demo-a-two-state-bold.html`
- B — Elevated Quiet: `/design-demos/demo-b-elevated-quiet.html`
- C — Vibrant Stadium: `/design-demos/demo-c-vibrant-stadium.html`

## Directions

| Demo | Direction       | Idea                                                                       |
| ---- | --------------- | -------------------------------------------------------------------------- |
| A    | Two-State Bold  | Dark, broadcast-grade landing that flips to a calm, dense light dashboard. |
| B    | Elevated Quiet  | Light everywhere; hierarchy from scale and hairline rules, not colour.     |
| C    | Vibrant Stadium | Floodlit pitch-green energy, club-coloured kits and stat tiles.            |

All three apply the audit fixes: WCAG-AA contrast (darker greys, amber, visible
borders), a hero rank number with live count-up and a 60s refresh bar, and a
consolidated above-the-fold layout.

These are throwaway design artifacts. The chosen direction gets rebuilt for real
in Tamagui (with BDD + visual-regression + page-error tests), not shipped from
this folder.
