# SimplyFPL — tester guide (no technical setup needed)

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
