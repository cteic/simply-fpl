# Frank the Scout — design prototypes

High-fidelity interactive mockups for the Championship Manager-style
gamification layer (issue #486). Companion pieces to
`apps/web/design/simplyfpl-demo.html`, in the same visual system (DM Sans/DM
Mono, warm neutral, stadium teal).

Each `.dc.html` file is one artboard; `canvas.json` lays them out. The files
use a component-template dialect (`{{holes}}`, `<sc-for>`, `<sc-if>`, a logic
class in `<script data-dc-script>`), so they don't open as plain HTML — read
them as annotated design source. Sample data throughout; player names and
prices are illustrative.

| File                  | Screen                                                     |
| --------------------- | ---------------------------------------------------------- |
| `Main.dc.html`        | Scout inbox, web — Frank's reports list + detail pane      |
| `Deadline.dc.html`    | Deadline day — countdown hero + resolvable squad issues    |
| `Matchday.dc.html`    | Matchday live feed, mobile — narrated events               |
| `MobileInbox.dc.html` | Scout inbox, mobile — post-launch Expo direction           |
| `LeaguePress.dc.html` | League press — weekly mini-league gazette + WhatsApp share |

Design decisions the artboards parameterise (as tweakable props): Frank's tone
(`gaffer` full personality vs `dry` data-first) and the Pro gate on follow-ups
(now moot — the app is free).

Implementation status: the scout inbox shipped first (`/scout`, flag-gated,
`NEXT_PUBLIC_FEATURE_SCOUT`). Deadline day and league press follow the same
derive-in-`fpl-client`, render-in-`apps/web` pattern.
