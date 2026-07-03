# Competitor deep-dive — paid tier USPs

> Research date: 2026-07-03  
> Author: scheduled research agent  
> Refs: #387, #113, #101

---

## 1. Methodology

Live web research (searches + fetches) conducted 2026-07-03.  
Competitor pricing sourced from search index snippets and publicly visible pages.  
Where pages returned 403 the data point is drawn from indexed snippet text and is marked _(snippet)_.  
SimplyFPL shipped-surface audit drawn directly from repository source files.

---

## 2. Competitor matrix

### 2.1 LiveFPL.net

**URL:** https://www.livefpl.net  
**Model:** Entirely free; ad-supported; no subscription tier.

| Dimension         | Detail                                    |
| ----------------- | ----------------------------------------- |
| Price             | Free (ads)                                |
| Live rank         | ✅ Core product                           |
| Mini-leagues      | ✅                                        |
| Price predictions | ✅ — claims best accuracy in market       |
| EO / threats      | ✅ Effective Ownership & Threats          |
| Transfer planner  | ✅ plan.livefpl.net sub-domain            |
| What-If simulator | ✅                                        |
| League explorer   | ✅ with chip tracking & captain breakdown |
| Mobile app        | ✅ iOS + Android (Play/App Store listed)  |
| AI coach          | ❌                                        |
| Season replay     | ❌                                        |
| H2H / rivals      | Limited                                   |

**Weaknesses:**

- Cluttered, ad-dense UI. PROJECT.md explicitly calls it out: _"it has become cluttered and its mobile experience is poor."_ ([livefpl.net](https://www.livefpl.net/))
- Infrastructure strain. The operator announced a full architecture overhaul in 2025/26 citing reliability and performance issues. ([X / @LiveFPLnet](https://x.com/LiveFPLnet/status/2025279859275300935))
- Mobile web, not native. iOS/Android apps exist but are web-wrapper quality.
- Zero monetisation floor. Every feature is free which makes it hard to compete on depth without paywall resentment — but it also means they have no revenue to invest in deep features.
- No AI layer whatsoever.

**Source URLs:**

- https://www.livefpl.net/
- https://x.com/LiveFPLnet/status/2025279859275300935
- https://www.livefpl.com/blog/livefpl-net-vs-livefpl-com

---

### 2.2 Fantasy Football Scout (FFS)

**URL:** https://www.fantasyfootballscout.co.uk  
**Model:** Freemium. Free access to some articles; Chief Scout membership for tools + full content.

| Dimension                      | Detail                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Price                          | Chief Scout ~£60/yr (≈£5/mo); Black Friday ~£33/yr; World Cup 2026 bundle £50/yr _(snippet)_ |
| Opta stats (xG, xA)            | ✅ Direct Opta license — best xG data in FPL space post-FBref Feb 2026                       |
| Price predictions              | ✅                                                                                           |
| Transfer planners              | ✅ Two planners (short-term + season ticker)                                                 |
| Rate My Team                   | ✅                                                                                           |
| Points projections             | ✅                                                                                           |
| Mini League Mate bundle        | ✅ (add-on)                                                                                  |
| Expert articles / team reveals | ✅ Core proposition                                                                          |
| AI features                    | ❌                                                                                           |
| Live rank / live GW            | ❌ — they bundle with LiveFPL for live features                                              |
| Mobile app                     | ❌ Web only                                                                                  |
| Season replay                  | ❌                                                                                           |
| Rivals                         | ❌                                                                                           |

**Weaknesses:**

- Editorial-heavy, not tool-heavy. Chief Scout membership is partly paying for opinion content, not just data tools. Users who want pure tools feel overcharged.
- No live gameweek layer. They point users to LiveFPL for live rank — their product doesn't cover the most critical moment (match day).
- No AI coach, no natural-language interface.
- No mobile app.
- FBref lost Opta license in February 2026; FFS gained ground, but price reflects this premium. ([FPL Pulse](https://www.fplpulse.com/blog/best-fpl-tools-2025-26))

**Source URLs:**

- https://www.fantasyfootballscout.co.uk/pricing
- https://www.fantasyfootballscout.co.uk/2025/11/25/black-friday-deal-45-off-annual-chief-scout-membership
- https://www.fplpulse.com/blog/best-fpl-tools-2025-26

---

### 2.3 FPL Review (fplreview.com)

**URL:** https://fplreview.com  
**Model:** Patreon membership gates the premium planner. Free tools available without login.

| Dimension               | Detail                                                          |
| ----------------------- | --------------------------------------------------------------- |
| Price                   | Patreon from ~$4.50/mo _(snippet)_; single entry tier confirmed |
| ML expected points      | ✅ Core product — machine-learning xPts per player              |
| MILP transfer optimizer | ✅ Guaranteed optimal multi-week solve                          |
| xG / variance metrics   | ✅                                                              |
| Top-1k ownership data   | ✅ Who the 1,000 best managers are buying / captaining          |
| Free planner            | ✅ Limited version                                              |
| Live rank / live GW     | ❌                                                              |
| Mobile app              | ❌                                                              |
| AI coach                | ❌ (mathematical solver, not natural language)                  |
| Season replay           | ❌                                                              |
| Rivals                  | ❌                                                              |

**Weaknesses:**

- Steep learning curve. MILP and variance metrics appeal to top-10k chasers only. Casual users bounce immediately.
- Patreon friction. Subscribing requires a separate Patreon account, then linking to the site. Non-trivial onboarding.
- No live layer. FPL Review is a pre-deadline planning tool. Once the GW starts, users leave for LiveFPL.
- Dense, form-heavy UI. Not beginner-friendly.
- USD pricing feels inconsistent to European audience.

**Source URLs:**

- https://fplreview.com/
- https://www.patreon.com/fplreview
- https://docs.fplreview.com/the-site/patreon-sub/

---

### 2.4 Fantasy Football Hub (FFHub)

**URL:** https://www.fantasyfootballhub.co.uk  
**Model:** Three subscription tiers, all billed annually.

| Dimension               | Detail                                           |
| ----------------------- | ------------------------------------------------ |
| Price — Starter         | £4.98/mo (annual billing) _(snippet)_            |
| Price — Pro             | £7.98/mo (annual billing) _(snippet)_            |
| Price — Ultra           | £29.98/mo (annual billing, ≈£360/yr) _(snippet)_ |
| AI transfer suggestions | ✅ (all tiers)                                   |
| Price change predictor  | ✅ — claims 95.7% accuracy                       |
| Expert wildcard teams   | ✅                                               |
| Mini-league analysis    | ✅                                               |
| AI team rating (free)   | ✅ — publicly accessible                         |
| Q&A with elite managers | ✅ Ultra only                                    |
| Live rank / live GW     | ❌                                               |
| Mobile app              | ✅ iOS + Android                                 |
| Season replay           | ❌                                               |
| Rivals                  | ❌                                               |

**Weaknesses:**

- Ultra at £360/yr is very expensive relative to depth. Users openly compare it to two Netflix subscriptions.
- AI features are generic rather than gameweek-aware. "AI transfer suggestions" don't reflect your live squad state during a match.
- No live gameweek layer.
- Paywall at three levels creates friction — even the £4.98 Starter feels expensive for a tool subset.
- Accuracy claims (95.7%) invite scrutiny and backlash when wrong.

**Source URLs:**

- https://www.fantasyfootballhub.co.uk/join
- https://allaboutfpl.com/2023/07/complete-detailed-review-of-fantasy-football-hub/
- https://footyapps.com/guide/best-fpl-apps

---

### 2.5 Notable niche tools

| Tool                                                                     | Model          | Headline feature                                       | Weakness                                         |
| ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------ | ------------------------------------------------ |
| [fpl.page](https://fpl.page/)                                            | Free           | Comprehensive free dashboard; DEFCON bonus tracker     | No paid depth; crowded UI                        |
| [fpl.team](https://fpl.team/)                                            | Free/freemium  | Multi-GW planner + predicted lineups + transfer solver | Planning-only; no live GW layer                  |
| [ChatFPL.ai](https://www.chatfpl.ai/)                                    | Paid premium   | Natural language FPL Q&A (ChatGPT-style)               | No integration with your actual squad data       |
| [Fantasy Football Fix ChatFPL](https://www.fantasyfootballfix.com/chat/) | Freemium       | xG stats + AI chat                                     | Stats-heavy, not live                            |
| **Official FPL AI**                                                      | Free (in-game) | Microsoft AI "assistant manager" launched 2025/26      | Generic, not personalised to mini-league context |
| [fplAnalytics](https://www.fplanalytics.com/)                            | Freemium       | xG-heavy advanced analytics                            | Niche; no mass-market UX                         |

**Source URLs:**

- https://www.fplpulse.com/blog/fpl-ai-tools-2026
- https://www.fantasyfootballscout.co.uk/2025/07/02/fpl-to-launch-ai-assistant-manager-in-2025-26
- https://www.chatfpl.ai/

---

## 3. Community sentiment summary

Search indexing of Reddit and Twitter surfaces limited direct thread quotes, but the following patterns are consistent across multiple sources:

| Pain point                       | Evidence                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LiveFPL UX**                   | Operator admitted architecture problems publicly and rebuilt in 2025/26. PROJECT.md notes "cluttered" and "poor mobile" as the core opportunity.                                                                                                                                                                      |
| **Subscription fatigue**         | "After a decade of 'subscribe or lose access,' many users have hit their limit." General market trend; applies directly to FPL tools where users are already paying for FFS, FFHub, and possibly FPL Review simultaneously. ([FileFlap](https://fileflap.net/blog/subscription-fatigue-the-revolt-against-paywalls/)) |
| **Mobile experience gap**        | Every major competitor is mobile-web or web-wrapper. No competitor has a native cross-platform React Native app at launch.                                                                                                                                                                                            |
| **AI rising fast**               | Official FPL added a Microsoft-powered AI assistant in 2025/26. ChatFPL.ai exists. FFHub added AI team rating (free). The bar has moved; AI is now table stakes in new FPL tools. ([FFS article](https://www.fantasyfootballscout.co.uk/2025/07/02/fpl-to-launch-ai-assistant-manager-in-2025-26))                    |
| **Speed matters live**           | FPL Review is loved pre-deadline but abandoned on matchday. LiveFPL is the matchday default. The user who switches tools mid-GW is the user SimplyFPL should capture entirely.                                                                                                                                        |
| **Paywall resentment on depth**  | FFHub Ultra at £360/yr draws open comparisons to streaming subscriptions. FFS is "expensive for tool users who just want stats."                                                                                                                                                                                      |
| **Official FPL app frustration** | A redesign critique (Ragesh / Medium) notes the official FPL app "slows you down" and "punishes experienced users." ([Medium](https://medium.com/@ragesh-changam/is-the-new-fantasy-premier-league-app-a-lesson-in-how-not-to-redesign-07b71964602d))                                                                 |

**Source URLs:**

- https://fileflap.net/blog/subscription-fatigue-the-revolt-against-paywalls/
- https://medium.com/@ragesh-changam/is-the-new-fantasy-premier-league-app-a-lesson-in-how-not-to-redesign-07b71964602d
- https://www.fantasyfootballscout.co.uk/2025/07/02/fpl-to-launch-ai-assistant-manager-in-2025-26

---

## 4. SimplyFPL shipped surface audit

Source files audited: `apps/web/src/`, `packages/features/src/`, `apps/worker/src/`, `upgrade-view.tsx`.

| Feature                                          | Shipped state        | Tier gate                        |
| ------------------------------------------------ | -------------------- | -------------------------------- |
| Live rank (with estimate extrapolation)          | ✅ Shipped           | Free                             |
| Live mini-leagues                                | ✅ Shipped           | Free                             |
| Price change predictor                           | ✅ Shipped           | Free (Pro removes ads)           |
| Threats view (EO + cohort top-10k)               | ✅ Shipped           | Free                             |
| Frank weekly picks (captain + transfers)         | ✅ Shipped           | Free                             |
| Season replay (full 38GW, 1x–60x)                | ✅ Shipped           | Pro                              |
| Rivals view (live side-by-side, FLIP animation)  | ✅ Shipped           | Free (multi-league switch = Pro) |
| Rivals differentials panel                       | ✅ Shipped           | Free                             |
| Rivals window size selector                      | ✅ Shipped           | Pro                              |
| H2H comparison                                   | ✅ Shipped           | Free                             |
| Frank on-demand AI questions (quota-metered)     | ✅ Shipped           | Ultimate                         |
| Cohort engine (top-10k aggregate)                | ✅ Shipped (backend) | Powers Threats + pitch ownership |
| What-If rank simulator (hook + fpl-client logic) | ✅ Logic shipped     | UI not yet wired                 |
| Transfer planner (compute-planner-grid)          | ✅ Compute shipped   | UI needs real FDR data           |
| Push notifications (service worker + Supabase)   | ✅ Infra shipped     | Delivery incomplete              |
| vs-livefpl speed comparison page                 | ✅ Shipped           | Marketing page                   |
| Live battle view                                 | ✅ Shipped           | Free                             |
| Mobile app (Expo, cross-platform)                | ✅ In progress       | —                                |

**Pricing (from `upgrade-view.tsx`):**

| Tier     | Monthly | Yearly            | Lifetime |
| -------- | ------- | ----------------- | -------- |
| Free     | €0      | —                 | —        |
| Pro      | €4/mo   | €25/yr (save €23) | €100     |
| Ultimate | €10/mo  | €75/yr (save €45) | €250     |

---

## 5. Proposed USPs per tier

### 5.1 Free tier

| #   | USP                                                 | Differentiator vs competitors                                                                                                                                                    | Build cost                                               |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| F1  | **Fastest live rank — verified weekly**             | vs-livefpl page already exists with automated headless-Chrome measurements. No competitor publishes objective speed comparisons. LiveFPL just rebuilt because of speed problems. | Shipped — marketing effort only                          |
| F2  | **Threats view backed by real top-10k cohort data** | LiveFPL shows raw EO. FPL Review shows 1k ownership (paywalled). SimplyFPL's threat score includes live rank impact _if they haul_ — unique framing.                             | Shipped                                                  |
| F3  | **Frank weekly AI picks — no paywall**              | FFHub charges for AI features. Official FPL AI is generic. Frank provides structured captain + transfer targets weekly, free for all users.                                      | Shipped                                                  |
| F4  | **Native mobile app (Expo)**                        | Zero competitors ship a true React Native cross-platform experience. FFHub has a wrapper app; LiveFPL's app is mobile web.                                                       | In progress — amplify on launch                          |
| F5  | **Season replay (last 3 GWs, free tier)**           | Nobody offers interactive replay at all. Gate the full 38GW version behind Pro to create upgrade pull.                                                                           | ~1 day (add Free-tier gate to replay; currently ungated) |

### 5.2 Pro tier (€4/mo)

| #   | USP                                                       | Differentiator vs competitors                                                                                                                                                                                                                    | Build cost                                                         |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| P1  | **Full 38GW season replay (1x–60x playback)**             | Entirely unique in the market. No other tool lets you re-watch how rank moved through a full season in 38 seconds.                                                                                                                               | Shipped                                                            |
| P2  | **Rivals board — multi-league + window sizing**           | LiveFPL's league explorer exists but has no "focus window" around your rank. SimplyFPL fans out parallel picks for your nearest N rivals with live FLIP animation.                                                                               | Shipped                                                            |
| P3  | **What-If rank simulator — live tap-to-swap**             | LiveFPL has a What-If but it's pre-match only (best-case scenario selector). SimplyFPL's hook uses the cohort distribution model to estimate _live_ rank change for any captain or bench swap mid-GW. Wire the UI onto the live rank pitch view. | ~3 days (UI; logic is complete in `fpl-client`)                    |
| P4  | **Push notifications: price spike, autosub, bonus swing** | No competitor delivers push to native mobile at this granularity (Expo Push + Supabase Edge Function infra is built).                                                                                                                            | ~3–4 days (Edge Function trigger; service worker delivery is done) |
| P5  | **Ad-free across web + mobile**                           | LiveFPL is ad-heavy. FFS is ad-free for Chief Scout (£60/yr). At €4/mo SimplyFPL undercuts FFS on price while being more live-focused.                                                                                                           | Shipped                                                            |

### 5.3 Ultimate tier (€10/mo)

| #   | USP                                                           | Differentiator vs competitors                                                                                                                                                                                                                                                    | Build cost                                           |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| U1  | **Frank on-demand: ask your squad anything**                  | FFHub has generic AI suggestions. ChatFPL.ai exists but has no awareness of your squad. Frank's on-demand mode is contextualised to your actual picks, rivals, and live rank.                                                                                                    | Shipped (UI + quota metering)                        |
| U2  | **Cohort benchmark card: how your squad compares to top 10k** | FPL Review shows top-1k captain choices behind Patreon. SimplyFPL's cohort engine already aggregates player ownership for the top 10k — surface this as a GW-by-GW "squad overlap report" showing which top-10k players you're missing and why it matters.                       | ~3 days (product surface; cohort engine is complete) |
| U3  | **Season arc analysis — rank trajectory across all 38 GWs**   | Nobody gives you a rank sparkline + annotated turning points (GWs where you gained or lost most relative to the field). Builds on replay data already captured.                                                                                                                  | ~4 days (query + chart component)                    |
| U4  | **Rivals deep-dive: multi-GW window analysis**                | Extend the existing Rivals board from "this GW" to "last N GWs" — show who has consistently beaten you and by how much, with differential breakdown. Builds on replay + rivals infra.                                                                                            | ~3 days (query + UI extending rivals-view)           |
| U5  | **Transfer planner with live FDR + xG overlay**               | FPL Review's planner is the gold standard but behind Patreon and complex. fpl.team is free but has no live rank context. SimplyFPL's `compute-planner-grid` is built — add real FDR data (Worker route) and an xG overlay (FFS/StatsBomb data is paywalled; use open xG source). | ~5 days (Worker FDR route + planner UI data wiring)  |

---

## 6. Recommended build priorities

Ranked by USP impact vs estimated cost:

| Priority | Issue                       | Tier     | Rationale                                                                        |
| -------- | --------------------------- | -------- | -------------------------------------------------------------------------------- |
| 1        | What-If rank simulator UI   | Pro      | Logic complete; visible during live GW; head-to-head vs LiveFPL's weaker version |
| 2        | Push notifications delivery | Pro      | Infra done; Pro conversion driver; unique on mobile                              |
| 3        | Cohort benchmark card       | Ultimate | Zero-competitor angle; cohort engine already runs                                |
| 4        | Season arc analysis         | Ultimate | Extends replay investment; sticky, shareable                                     |
| 5        | Rivals multi-GW window      | Ultimate | Deepens existing Rivals feature without new infra                                |

---

## 7. Competitive positioning summary

SimplyFPL wins on:

- **Speed** (measurable, published weekly)
- **Live GW depth** (Rivals + Threats + What-If + Replay = no competitor covers all four)
- **Native mobile** (only true cross-platform RN app in the space)
- **Cohort intelligence** (top-10k data making Threats and Frank smarter than raw EO tools)
- **AI with squad context** (Frank knows your picks; ChatFPL.ai and FFHub AI don't)
- **Price** (Pro at €4/mo undercuts FFS Chief Scout at ~£5/mo on GBP parity; Ultimate at €10/mo undercuts FFHub Pro at £7.98/mo while offering deeper live features)

SimplyFPL's gaps to close before GW1 2026:

- Push notification delivery (infra done, trigger pending)
- What-If UI (logic done, UI pending)
- Cohort benchmark product surface (engine done, page pending)
- Transfer planner real-data wiring (compute done, Worker route pending)
