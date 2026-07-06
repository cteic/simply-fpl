# SimplyFPL — co-founder handover (testing + Bet365)

Self-contained copy for sending — everything you need while Pete is away, no technical setup required. (Repo copies: `partner-test-script.md` and `bet365-partner-plan.md`; this file combines them.)

---

# Part 1 — Testing the app

Everything below runs in a normal browser. Nothing to install, no account needed.

## The two URLs

- **Production** (what real users will see): https://simplyfpl.com — until the domain is connected, use https://simply-fpl.pages.dev
- **Staging** (latest work-in-progress, updates automatically many times a day): https://dev.simply-fpl.pages.dev

Test on staging by default. If something looks broken on staging but fine on production, that's still worth reporting — it means a regression is about to ship.

## Getting set up (once)

1. Open the site and enter an FPL team ID when asked. Any public team works — grab one from the FPL website (the number after `/entry/` in any team's URL), or use your own.
2. On your phone: open the same URL in the browser, then use "Add to Home Screen" (Share menu on iPhone, browser menu on Android). The app installs like a native app — test it that way too.

## Simulating a live gameweek (the important one)

The season is over, so real pages show final data. To see the app behave as if a gameweek is **live right now**:

1. Go to `/replay` (e.g. https://dev.simply-fpl.pages.dev/replay).
2. Pick a starting gameweek and press play. Use the speed control to fast-forward.
3. Watch the live rank page update as "matches" happen: points ticking up, rank moving, players lighting up on the pitch, bonus points appearing as provisional and then confirming.
4. Try pausing, seeking to another gameweek, and switching speeds.

That's the core product experience — most of your testing time should be here.

## What to test (checklist)

- [ ] Home page: enter team ID → live rank dashboard appears
- [ ] Replay: play, pause, seek, speed change — anything freeze, flicker, or show obviously wrong numbers?
- [ ] Leagues: your mini-leagues appear, standings look right, tapping one opens the rivals board
- [ ] Rivals board: rows expand, captain/bench info readable
- [ ] Head-to-head (`/h2h`): two teams side by side — do the pitches ever overlap or get cut off? Try rotating your phone, resizing the browser window, tablet size especially
- [ ] Speed comparison (`/vs-livefpl`): loads, numbers present, nothing broken
- [ ] Phone: repeat the top three items on the installed home-screen version
- [ ] General: anything slow, ugly, confusing, or where you'd not know what to do next

## How to report

For each problem, send (WhatsApp/email whatever works):

1. The URL you were on
2. What you did, what you expected, what actually happened
3. A screenshot (or screen recording for anything that moves)
4. Device + browser (e.g. "iPhone 15, Safari")

One message per problem beats one giant list — they get tracked individually.

---

# Part 2 — Bet365 affiliate (your other job)

Everything here is account/paperwork work — no coding. The code side (ad placement, geo gating, age gate) is tracked separately in issue #131 and gets built after approval comes through. Your job is to get us **approved and compliant on paper** so the build isn't blocked later.

## Week 1 — apply (do this first, the clock on approval only starts when you submit)

1. Go to `affiliates.bet365.com` → register a new affiliate account.
2. Details you'll need:
   - **Website**: https://simplyfpl.com (describe it as a Fantasy Premier League companion app — live rank tracking, mini-league tools).
   - **Audience**: UK/Ireland-centric FPL players, adults, football bettors overlap.
   - **Promotion method**: on-site display placements only (no email spam, no paid search on their brand terms — saying otherwise gets applications rejected).
   - **Payment details** for commission payouts (business bank account).
3. Expect a manual review: typically several days to a few weeks. If a form asks about traffic, be honest — pre-launch/low. If rejected for low traffic, we simply reapply post-launch with real numbers; nothing is lost.
4. When approved, you'll get access to: tracking link templates, banner creatives, and commission terms (usually CPA or revenue-share — screenshot the offered terms and save them).

## What to save for Pete (put it all in one place)

- Affiliate account login (password manager, not chat/email)
- Affiliate ID + tracking link template
- The commission terms offered
- Any compliance requirements they state (they usually send a policy doc)

## Compliance homework (reading, ~2 hours total)

These decide what the ads may look like when we build them:

1. **UK CAP Code, gambling section** — rules on gambling ads: no appeal to under-18s, no "risk-free" language, must include begambleaware.org. Skim the summary on the ASA website.
2. **Ireland — Gambling Regulation Act 2024** — advertising provisions are phasing in; check the current status of the ad-watershed and online rules (GRAI website). We have EU/Irish traffic, so this applies to us, not just UK rules.
3. Write down anything that surprises you in a short note for Pete — this feeds the legal sanity check we already track (#101).

## Hard rules (so nothing ships wrong by accident)

- **No ad goes live** until the site has: 18+ age gate, geo-blocking for restricted countries, and the begambleaware/GAMSTOP footer — all already specified in #131 and built by us, not you.
- Don't sign anything that requires tracking pixels/cookies without checking with Pete first — we run cookieless analytics on purpose and want click-only attribution.
- Don't commit to ad volume, exclusivity, or placement promises. Approval only.

## Why now

Approval latency is the long pole — days to weeks of waiting we can overlap with launch work. Registering costs nothing and commits us to nothing; revenue integration stays a post-launch, growth-gated decision (see #131).
