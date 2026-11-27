# Making money from Frank: a plan

Written 2026-11-26. Cost figures come from
`docs/notes/frank-cost-and-free-tier.md`, which measured them. Revenue figures
are scenarios with their assumptions stated, not forecasts. Nothing here is
built yet; the last section is the build order.

## The verdict

**Do not charge per question. Give questions away, and charge for what the
answers are built on.**

A question costs about a fortieth of a cent to answer. At that price the
question is not the product, it is the cheapest marketing SimplyFPL has. The
thing worth paying for is an answer that knows your team, your rivals and what
changed overnight, delivered before you have to ask.

Today the gate is the wrong way round. Only Ultimate, a lifetime tier, can ask
Frank anything. Free and Pro users read one cached weekly payload that is
identical for everyone. So the feature most likely to make someone say "I
would pay for this" is the one almost no user is allowed to touch.

## What a question costs

On Claude Haiku 5.5, with about 4,000 tokens of cached context and a 250-token
answer:

|                                             | cost           |
| ------------------------------------------- | -------------- |
| One question                                | about $0.00027 |
| 1,000 questions                             | about $0.27    |
| A user asking 80 a month (today's hard cap) | about $0.02    |
| Questions per $1                            | about 3,700    |

Set against a Pro subscription at €4 a month, the heaviest user the current cap
allows costs half a percent of what they pay. The AI bill is not the
constraint. Conversion is.

Payment fees are a bigger cost than the model. Card processing on a €4 charge
takes roughly 7 to 8 percent, where on the €25 annual plan it is under 3. That
alone is a reason to push annual.

## What free should get

**Three questions a week, squad-aware, for any signed-in user.**

Squad-aware is the point. A generic answer is a worse ChatGPT. An answer that
says "you own Tavernier, he is on four yellows, and two managers above you in
Trycare do not" is something a manager cannot get anywhere else, and SimplyFPL
already holds every fact in that sentence.

What it costs to give away, if every active user spent all three every week:

| monthly active users | questions a month | model cost a month |
| -------------------- | ----------------- | ------------------ |
| 5,000                | 65,000            | about $18          |
| 20,000               | 260,000           | about $70          |
| 50,000               | 650,000           | about $175         |

In practice most users ask none, so the real figure is a fraction of this.
Signing in is the price of admission, which also gives a per-user quota
something to hang on and builds the email list.

## What people pay for

Three things, none of which is "more questions" on its own.

1. **Frank comes to you.** A pre-deadline brief pushed to your phone: who to
   captain, which of your players is a doubt, whose price moves tonight, who in
   your mini-league just transferred in the player you were dithering over.
   Every input already exists in this repo: the scout inbox, the deadline
   brief, FPL's own price projections, the rival views. Free users ask; paying
   users get told.

2. **Frank knows your rivals.** Questions about a named mini-league or a named
   rival: "how do I catch Niall", "what is the template in my work league and
   where am I different". This needs rival squads fetched and put in the
   prompt, which is real work and a genuine reason for a gate.

3. **Frank plans ahead.** Multi-gameweek transfer plans against the fixture
   ticker, chip timing, and what-if against the live rank curve: "what happens
   to my rank if I take a hit for Haaland". The curve and the target-score
   maths shipped in #509, so Frank can quote a number where a general chatbot
   can only wave its hands.

Plus a generous allowance, 150 questions a month, so a paying user never meets
a counter.

### Tiers

|                                        | Free        | Pro, €4 a month or €25 a year |
| -------------------------------------- | ----------- | ----------------------------- |
| Ask Frank                              | 3 a week    | 150 a month                   |
| Knows your squad                       | yes         | yes                           |
| Knows your rivals and mini-leagues     | no          | yes                           |
| Multi-gameweek plans and rank what-ifs | no          | yes                           |
| Pre-deadline brief, pushed             | no          | yes                           |
| Goal and price alerts, pushed          | in-app only | pushed                        |

Ultimate stays as it is for the people who already bought it. I would stop
selling a lifetime tier on anything with a running cost, however small:
revenue arrives once and the obligation never ends.

## Where the paywall goes

At the moment of need, not on a pricing page.

- **The fourth question of the week.** The user has just had three useful
  answers. Show the fourth question they typed, greyed, with "ask this now" on
  the upgrade button.
- **A rival question from a free user.** Answer the squad half of it in full,
  then say exactly what Pro would add: "Pro would also check this against the
  11 managers in Trycare."
- **Deadline day.** The brief is the upgrade ad. Free users see its headline
  and the first item; the rest is one tap away.

Lead with the annual price as the default. €25 a year reads as roughly €2 a
month, undercuts the monthly by nearly half, costs less to process, and a
season is the natural unit an FPL manager thinks in.

## What this could earn

Scenarios only. The two inputs that matter, active users and conversion rate,
are not known for SimplyFPL yet, so both are varied. Blended revenue per paying
user is taken as €2.60 a month, assuming two thirds choose annual.

| monthly active users | paying at 2% | paying at 4% | revenue a month at 2% | at 4%  |
| -------------------- | ------------ | ------------ | --------------------- | ------ |
| 5,000                | 100          | 200          | €260                  | €520   |
| 20,000               | 400          | 800          | €1,040                | €2,080 |
| 50,000               | 1,000        | 2,000        | €2,600                | €5,200 |

Against that, the model bill for the whole user base, free and paid, is in the
tens to low hundreds of dollars a month. The honest reading is that Frank's
running cost is a rounding error at every scale in this table, and the entire
question is whether the free experience is good enough to convert.

Measure that before believing any row above. The number to watch is the share
of free users who hit the weekly limit, because that is the pool the paywall
actually sees.

## What has to be true first

Three things block opening a free tier, and they are safety, not polish.

1. **The global daily budget was not atomic** (#412). It read every row for
   the day, summed the tokens, then decided, so two requests together both saw
   the pre-spend total, and with `FRANK_DAILY_SPEND_CAP_TOKENS` unset there
   was no cap at all. Now one Postgres statement,
   `frank_reserve_tokens` in migration `0011_frank_daily_budget.sql`, with a
   default cap of five million tokens a day. The route falls back to the old
   check if the function is not deployed, so code and migration can ship in
   either order. **The SQL has not been run against a database**: no Postgres
   was available where it was written. Apply the migration, then check it
   with the queries in the PR description before trusting it.

   An earlier draft of this note said to copy `checkAndIncrementDailySpend`
   from `apps/worker/src/news/team-summary.ts` because it "increments and
   checks in one step". That was wrong. It is a KV read followed by a KV
   write and races the same way; KV has no atomic increment. It is driven by a
   cron rather than by users, so the exposure is small, but it is not a
   pattern to copy.

2. **The per-user quota fails safe** (#415). Two racing requests both insert a
   reservation, both recount, both see the over-limit total and both back out.
   It can wrongly reject one request at the boundary; it cannot over-admit. That
   is a nuisance to fix, not a spending risk.
3. **Frank on mobile is a paywall stub.** It renders "Available on Pro and
   above" and nothing else, so a free tier needs the ask UI built there.

And one commercial point to check before selling inside the iOS app. The mobile
app currently sends people to the website to subscribe. Apple's rules on that
vary by region and have been changing, and getting it wrong risks the listing.
That needs a proper read of the current guidelines for the markets you launch
in, not an assumption from me.

## Build order

1. Apply and verify the atomic global budget (#412). Nothing else ships until
   a cap is a cap.
2. Free tier: three questions a week behind an env flag, default off, so
   turning it on is a decision rather than a deploy side effect.
3. Put the squad in the prompt properly. The status note records that picks go
   in as player ids with no names, which is most of why answers feel generic.
4. The paywall at question four, with annual as the default.
5. Rival-aware answers for Pro.
6. The pushed pre-deadline brief, which needs native push on mobile first.
7. Instrument the share of free users hitting the limit, and price from that.
