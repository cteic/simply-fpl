# Store listing copy

Source of truth for the App Store and Play Store listings. Paste from here into
the consoles so both stores stay consistent and so the copy stays reviewable in
git.

Every privacy answer below is derived from the privacy policy at
`apps/web/src/content/legal/privacy-policy.ts`. Where the mobile build collects
less than the policy allows, this file says so. Nothing here may contradict that
policy. When the policy changes, re-check this file in the same change.

---

## Listing fields

| Field                      | Value                                                  | Limit    |
| -------------------------- | ------------------------------------------------------ | -------- |
| App name                   | `SimplyFPL`                                            | 30 chars |
| Subtitle (Apple)           | `Live FPL rank and leagues`                            | 30 chars |
| Short description (Google) | `Watch your FPL rank move live, gameweek by gameweek.` | 80 chars |
| Primary category           | Sports                                                 |          |
| Secondary category (Apple) | Utilities                                              |          |
| Support URL                | `https://simplyfpl.com/support`                        |          |
| Marketing URL              | `https://simplyfpl.com`                                |          |
| Privacy policy URL         | `https://simplyfpl.com/privacy`                        |          |
| Copyright                  | `cteic`                                                |          |

The three URLs above are served by the pages added in pull request #489. None of
them resolve until that work is merged and deployed. Apple rejects a submission
with an unreachable privacy policy URL, so check all three load before
submitting.

### Keywords (Apple, 100 characters, comma separated, no spaces after commas)

```
fpl,fantasy,football,live rank,gameweek,mini league,h2h,points,premier,soccer,fixtures,captain
```

94 characters. Google Play has no keyword field and ranks on the descriptions,
so the terms above are worked into the full description instead.

### Promotional text (Apple, 170 characters, editable without a new build)

```
Your live gameweek rank, updated while the matches are still being played. No signup needed to start.
```

100 characters.

### Full description (both stores, 4000 character limit)

```
SimplyFPL shows your Fantasy Premier League rank moving while the games are still on.

The official game updates your rank after the gameweek settles. SimplyFPL recalculates it from the fixtures in progress, so you can see where you stand during the matches instead of waiting.

WHAT YOU GET

Live rank
Your overall rank, recalculated from in-progress fixtures as goals, assists and bonus points land.

Gameweek points
Live points for your starting eleven, with captain and chip multipliers applied.

Mini-leagues
Your leagues re-sorted live, so you can see who is passing you during the gameweek rather than after it.

Head to head
Put your team against any other team ID and watch both scores move side by side.

Price changes
Daily predicted price rises and falls, derived from net transfer activity across the whole player base.

Threats and rivals
The players and managers closest to you, and what each of them does to your rank.

NO SIGNUP TO START

Enter your team ID and the live rank, league and head-to-head screens work straight away. An account is optional and only adds saved preferences across devices.

ABOUT THE DATA

Squad, points, rank and league standings come from the public Fantasy Premier League API. SimplyFPL never asks for your FPL account password and has no access to it. Live rank is an estimate recalculated from in-progress fixtures, not an official figure.

SimplyFPL is not affiliated with the Premier League or Fantasy Premier League.
```

The closing line is the exact wording already carried by the web footer
(`apps/web/src/components/app-footer.tsx`) and by the `common.disclaimer` i18n
key. Keep all three identical. If one changes, change all of them.

---

## Apple privacy nutrition labels (draft answers)

Scope note: the mobile build collects less than the web app. It has no analytics
SDK, no payment flow, no push notifications and no Frank question input. The
answers below describe the mobile build only.

### Data used to track you

**None.** The app contains no advertising SDK, no analytics SDK and no
third-party tracker. Nothing is shared with a data broker and nothing is linked
across apps or websites owned by other companies.

### Data linked to you

| Data type          | Collected | Purpose           | Notes                                                            |
| ------------------ | --------- | ----------------- | ---------------------------------------------------------------- |
| Email address      | Yes       | App functionality | Only if the user creates an account. Used to send sign-in links. |
| User ID            | Yes       | App functionality | The Supabase account id, created only with an account.           |
| Other user content | Yes       | App functionality | FPL team ID and the mini-leagues the user chooses to track.      |

### Data not linked to you

| Data type        | Collected | Purpose           | Notes                                                                                      |
| ---------------- | --------- | ----------------- | ------------------------------------------------------------------------------------------ |
| Other usage data | Yes       | App functionality | Server request logs (IP, user agent, path), kept 30 days, used for security and debugging. |

### Data not collected

Contact info beyond email, health, financial info, precise or coarse location,
contacts, photos, audio, browsing history, search history, identifiers for
advertising, purchases, diagnostics beyond the request logs above.

### Account deletion

Apple requires an in-app route to account deletion for any app that creates an
account. The policy directs users to email `support@simplyfpl.com`. An email
route alone does not satisfy the requirement. **Open question for Pete:** either
add an in-app delete control to the profile screen before submitting, or ship
the first version with no account creation at all.

---

## Google Play data safety form (draft answers)

### Collection and sharing

| Question                                       | Answer                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Does the app collect or share user data?       | Yes                                                                            |
| Is all data encrypted in transit?              | Yes, every request uses HTTPS                                                  |
| Do you provide a way to request data deletion? | Yes, by email to `support@simplyfpl.com` (see the account deletion note above) |
| Is the data collection required or optional?   | Optional. The core screens work without an account                             |
| Has the app been independently validated?      | No                                                                             |

### Data types

| Category                 | Type                         | Collected | Shared | Required | Purpose                             |
| ------------------------ | ---------------------------- | --------- | ------ | -------- | ----------------------------------- |
| Personal info            | Email address                | Yes       | No     | Optional | Account management                  |
| Personal info            | User IDs                     | Yes       | No     | Optional | Account management                  |
| App activity             | Other user-generated content | Yes       | No     | Optional | App functionality                   |
| App info and performance | Crash logs                   | No        | No     | n/a      | No crash reporting SDK is installed |

### Third parties that receive data

Supabase (EU region) provides sign-in and the database. Cloudflare serves the
Worker that fetches public FPL data. Both are processors acting on instruction,
not independent recipients, so neither counts as "shared" on this form.

Stripe, PostHog and Anthropic appear in the privacy policy because the web app
uses them. The mobile build calls none of them, so they are left out of the
mobile data safety answers. If a paid tier, analytics or a Frank question input
is ever added to mobile, this form must be refilled before that version ships.

---

## Content rating and declarations

| Question               | Answer                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| Target age             | 16 and over. The policy states the service is not directed at under 16s |
| Contains ads           | No, the mobile build has no ad SDK                                      |
| In-app purchases       | No, the mobile build has no payment flow                                |
| Gambling or contests   | No. Fantasy football with no stake, prize or wager                      |
| User generated content | No, nothing a user enters is shown to another user                      |

The web app sells a Pro tier through Stripe. The mobile build does not, and
Apple's rules require digital goods to be sold through in-app purchase. **Do not
mention a paid or Pro tier anywhere in the mobile listing** until in-app purchase
is implemented, because advertising a tier that cannot be bought in the app is a
common rejection.

---

## Comparative advertising: keep out of store copy

The web app has a comparison page at `/vs-livefpl`, linked from the footer as
"SimplyFPL vs livefpl.net".

**None of that page, its wording, or the competitor's name may appear in store
listing copy, screenshots, the promotional text or the keywords.**

Reason: no legal check on comparative advertising was ever recorded for that
page. Naming a competitor in store copy is a separate and higher-risk use than
naming one on your own site. It engages the EU Comparative Advertising Directive
(2006/114/EC) and both stores' rules on referring to other apps, and Apple in
particular rejects listings that name another product. The page may stay on the
web. It stays out of the stores until a legal review is recorded.

This is a hold, not a conclusion that the page is unlawful. Lift it only when a
documented legal check says otherwise.

---

## Trademark risk to watch

"Fantasy Premier League" and "Premier League" are protected marks. The copy
above uses the full phrase only when describing where the data comes from, and
leans on "FPL" elsewhere. Both stores have rejected third-party companion apps
for leading with a protected game name. If a reviewer objects, cut the full
phrase from the subtitle and keywords first and keep it only in the data-source
paragraph and the disclaimer.
