# RFC 007 — Pro-tier Notifications (Web Push + Mobile Push)

Status: Draft
Author: Pete
Last updated: 2026-06-10
Workstream slug: `notifications`
Depends on: RFC 001 (live fan-out — supplies the live tick the price/captain/rank triggers ride on); soft overlap with the Stripe `is_pro` flag in `profiles` (`docs/supabase/001_initial_schema.sql:9`).

## 1. Problem statement

Pro is currently a payment with no Pro-only product surface beyond ad removal and the deeper rivals view. The Pro tier needs **one feature a free user cannot replicate by leaving a tab open**, and that feature is push. The single sentence on the landing page should be: _"We tell you when your captain returns, when your rank moves, when a watched player drops in price — even when SimplyFPL is closed."_

LiveFPL.net has no push. The closed competitors (FPLanalytics, fpl.team) wrap push in their native apps but their web surfaces don't. A focused, opinionated push product on web at launch — and on mobile shortly after — is a genuine Pro wedge for the cost of one Cloudflare Worker route, one Supabase table, and three reliable senders (web, APNs, FCM).

The job of this RFC is to pick **one path** for each surface (not survey options), enumerate the human steps Pete has to take in the Apple and Google consoles (so we don't get blocked mid-implementation), and slice the work into PRs that each land in under a day.

## 2. Current state

- `apps/web` is Next.js 15 App Router, deployed on Cloudflare Pages. CSP in `apps/web/next.config.mjs:5-15` allows `connect-src https://*.workers.dev wss://*.workers.dev https://*.supabase.co` — no push origin allowed yet.
- `apps/mobile` is Expo SDK 52 + Expo Router (`apps/mobile/package.json:18`), bundle IDs already set: iOS `com.simplyfpl.app`, Android `com.simplyfpl.app` (`apps/mobile/app.json:18,25`). Mobile is **post-launch** but the bundle IDs are reserved and we should walk the push setup before submission so the first build isn't blocked by missing entitlements.
- `apps/worker` (Cloudflare Worker, `wrangler.toml`) already runs scheduled cron triggers (`wrangler.toml:54-60`), holds KV (`FPL_CACHE`), R2 (`VS_BUCKET`, `RECORDINGS_R2`), and a Durable Object (`LIVE_GW`). Adding another scheduled job and one HTTP route is incremental, not architectural.
- Supabase has `profiles.is_pro` (`docs/supabase/001_initial_schema.sql:9`) and a `subscriptions` table. RLS is on by default. No notification table exists.
- Feature flags follow `NEXT_PUBLIC_FEATURE_*` pattern (`apps/web/src/lib/feature-flags.ts:18-22`) and are inlined at build time. We extend the same pattern.
- No service worker is registered today, no `web-push` dep, no `expo-notifications` plugin in `app.json`.

## 3. Goals / non-goals

### Goals

- Pro users on the web get **opted-in push notifications** for a small, well-chosen event set (§7). Non-Pro users see the value prop but cannot subscribe.
- Same event set delivered to iOS and Android via Expo's push service once the mobile app ships.
- Fan-out happens **server-side** — clients never see who else is subscribed.
- Consent flow is **GDPR-clean**: contextual prompt, granular per-event-type toggles, easy revoke from `/settings`.
- Operational cost stays at or near zero at our expected launch volume (single-thousands of Pro users, single-digit notifications per user per GW).

### Non-goals

- SMS or email (different consent regime, different deliverability problem — out of scope).
- Real-time chat / DM-style notifications. We send **transactional event** notifications, never broadcast marketing.
- Push to non-authenticated users. Anonymous push is technically possible but useless to us — every trigger we care about is keyed to a manager's `entry_id`, which means we already need an account.
- Per-user A/B of notification copy. Not at launch volume.
- Cross-device de-dup (web + mobile both fire). Phase 2 once we see how annoying it actually is.

## 4. Architecture overview

```
                 ┌──────────────────────────────────────┐
                 │ Supabase                             │
                 │   profiles.is_pro                    │
                 │   push_subscriptions (new, §8)       │
                 │   notification_prefs   (new, §8)     │
                 │   notification_log     (new, §8)     │
                 └────────────────┬─────────────────────┘
                                  │ service-role read
                                  ▼
┌──────────────┐   live tick   ┌──────────────────────────────────┐   web-push    ┌──────────────┐
│ apps/worker  │──────────────▶│ apps/worker /notify/dispatch     │──────────────▶│ Push services│
│ LiveGwDO     │   cron tick   │   - reads triggers from KV/DO    │   APNs/FCM    │ (browser,    │
│ scheduled()  │──────────────▶│   - matches subscribers          │  via Expo     │  Apple,      │
└──────────────┘               │   - signs VAPID JWT              │               │  Google)     │
                               │   - POSTs to endpoint            │               └──────┬───────┘
                               └─────────┬────────────────────────┘                      │
                                         │ writes                                        │ delivers
                                         ▼                                               ▼
                                ┌──────────────────┐                              ┌──────────────┐
                                │ notification_log │                              │ Browser SW   │
                                └──────────────────┘                              │ Mobile OS    │
                                                                                  └──────┬───────┘
                                                                                         │ click → deep link
                                                                                         ▼
                                                                                  apps/web | apps/mobile
```

All fan-out runs **inside the existing Worker**. Reasoning in §6.

## 5. Web push (Next.js / Cloudflare Pages)

### 5.1 Browser support — what we can realistically ship

| Browser             | Supports Web Push (VAPID) | Notes                                                                                              |
| ------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| Chrome desktop ≥ 50 | Yes                       | Full support. ~70% of our expected web traffic.                                                    |
| Edge ≥ 17           | Yes                       | Chromium engine, same code path.                                                                   |
| Firefox ≥ 44        | Yes                       | Full support, slightly different endpoint host.                                                    |
| Safari desktop ≥ 16 | Yes                       | macOS 13+. Different historically (APNs-direct), now VAPID-compatible.                             |
| Safari iOS ≥ 16.4   | **PWA only**              | Requires the site to be added to the home screen as a PWA. Plain browser tab cannot subscribe.     |
| Chrome Android ≥ 50 | Yes                       | Full support.                                                                                      |
| In-app browsers     | Mostly no                 | Twitter/X, Instagram in-app webviews don't expose `PushManager`. Detect and show "open in Safari". |

**Implication for product copy:** the opt-in card has to be honest that iPhone users need to "Add to Home Screen" first. We ship a small explainer with screenshots — that's a separate ticket but called out so we don't surprise users at launch.

### 5.2 VAPID keys

- Generate one VAPID key-pair per environment (dev / preview / prod) with `npx web-push generate-vapid-keys`. P-256 ECDSA, two base64-url-encoded strings.
- **Public key** → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Inlined in the browser bundle; safe to be public.
- **Private key** → stored as a Cloudflare Worker secret: `wrangler secret put VAPID_PRIVATE_KEY`. Never exposed to the client.
- **VAPID subject** → `VAPID_SUBJECT="mailto:pete@cteic.ie"` as a worker var. Required by spec; surfaces to push services if they need to reach the sender.
- Rotation: keys can be rotated, but every existing subscription is bound to the public key it was minted under. We don't rotate unless leaked. If leaked, rotate and accept that subscribers must re-opt-in.

### 5.3 Service Worker in App Router

Next.js App Router does not have a first-class "service worker" plugin we need to take on as a dependency. The minimum-viable approach:

- Drop a static **`apps/web/public/sw.js`** at the public root. Cloudflare Pages serves `/public/*` at site root, so it lives at `https://simplyfpl.com/sw.js`. Scope of the SW = directory it is served from, so root is necessary for site-wide push.
- Register from a small `'use client'` component mounted from `app/layout.tsx` once feature-gated: `navigator.serviceWorker.register('/sw.js')` inside a `useEffect` guarded by `FEATURE_PUSH` + `isPro`. Don't register for free users — there's nothing for the SW to do for them.
- The SW has two responsibilities and no others: `push` (renders the notification) and `notificationclick` (focuses or opens a tab at the deep-link URL).
- We do **not** layer a PWA library (`next-pwa`, `serwist`, etc) on this — those bring offline-caching opinions we haven't asked for and that fight Next's RSC streaming. We can revisit if we ever ship offline.

CSP impact: adding `worker-src 'self'` to the CSP in `apps/web/next.config.mjs`. The existing `script-src 'self'` already lets the SW load.

### 5.4 Opt-in UX (GDPR-aware)

Hard rule from EDPB guidance on consent: **no permission request on first page load**. The prompt is contextual and tied to a deliberate action.

- **Where**: a "Notifications" card on `/settings` (Pro users only), and a one-time **dismissable banner** inside `/live` after the user has spent ≥ 60s on the page with a tracked entry loaded — that's the moment the value lands.
- **What we ask**: a single "Enable browser notifications" button. Inside the card, four checkboxes for the event types (§7) — default OFF except "GW deadline reminder" which defaults ON. Saving the prefs without enabling the OS permission is allowed; we just won't send anything.
- **What we don't do**: no `Notification.requestPermission()` on app start, no nag-screens, no re-prompting after dismiss. If the user picks "Deny" in the OS prompt the card switches to "Notifications blocked — re-enable in browser settings" and we never re-prompt programmatically (browsers wouldn't show it anyway).
- **Revoke**: same `/settings` card has "Disable notifications" — unregisters the push subscription server-side and locally.

### 5.5 Library choice

**Recommendation: `web-push` (the npm one).**

| Library                                                     | Verdict        | Why                                                                                                                                                                                                         |
| ----------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`web-push`](https://github.com/web-push-libs/web-push)     | **Pick this.** | Battle-tested, handles VAPID JWT + RFC 8291 message encryption. Pure JS, runs on Workers.                                                                                                                   |
| OneSignal / Pusher Beams / Firebase Cloud Messaging-for-web | No             | Each is a hosted SaaS with its own SDK, dashboard, and pricing tier above free. Pulls user identity into a vendor we don't otherwise need. We'd be re-buying the storage layer we already have in Supabase. |
| `serwist` / `next-pwa` (SW-side helpers)                    | Maybe later    | Address SW lifecycle / caching, not sender-side encryption. Orthogonal to the library question.                                                                                                             |
| Hand-roll RFC 8291 encryption                               | No             | ECE + AES-128-GCM payload encryption is the kind of code we shouldn't be maintaining ourselves.                                                                                                             |

`web-push` on Cloudflare Workers: works with `nodejs_compat` (already set in `wrangler.toml:4`). The package uses Node's `crypto` for ECDSA + ECDH; this is provided by the Workers nodejs compat layer.

### 5.6 Payload shape + click-through deep links

Push messages are small (≤ 4 KB after encryption) and treat them as **render hints, not data carriers** — the SW must be able to render without re-fetching, since the user may be offline at receive time. Long content lives on the page we deep-link to.

```ts
// packages/types/src/notifications.ts (to be added)
interface PushPayload {
  v: 1; // schema version, bump on breaking changes
  type: 'price-drop' | 'captain-scored' | 'rank-swing' | 'bonus-confirmed' | 'deadline';
  title: string; // ≤ 60 chars — single line
  body: string; // ≤ 120 chars — rendered, not truncated by OS
  url: string; // absolute path on simplyfpl.com — opened on click
  tag?: string; // collapses duplicates: e.g. `price-drop:${playerId}`
  id: string; // server-side notification_log row id, for click analytics
}
```

Click-through pattern in the SW: `notificationclick` looks for an open tab on the same origin, focuses it and posts a message; if none, opens a new tab at `payload.url`. Deep links use existing routes — e.g. price drop → `/prices?focus=<playerId>`, captain scored → `/live/team/<entryId>`. No new routes required; query string focus parameters get added to existing views in follow-up PR #4 (§13).

## 6. Backend & storage

### 6.1 Where the fan-out runs

**Recommendation: keep it in the existing Cloudflare Worker (`apps/worker`).**

| Option                 | Pros                                                                                                                                | Cons                                                                                                                                       | Verdict       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| **Cloudflare Worker**  | Already running. Already on the live tick. Already holds KV + DO state. Adds zero new infra. `web-push` runs under `nodejs_compat`. | Hard 50ms CPU / 30s wall on the free tier (we're on paid, so 30s CPU). Fan-out to 10k subscribers in one request needs batching.           | **Pick this** |
| Supabase Edge Function | Closer to the data; no need to ship VAPID secrets to the Worker.                                                                    | Splits "live data lives here, fan-out lives there"; cold starts on Deno; another deployment surface; can't subscribe to the LiveGwDO tick. | No            |
| New Node service       | Most flexibility.                                                                                                                   | New host, new deploy, new monitoring. Pure cost.                                                                                           | No            |

Fan-out scale at launch is small: assume 1,000 Pro users × 4 notification types × ~3 sends/GW = 12k sends per GW peak. A Worker handles this trivially in batches of ~100. We add a queue-backed retry layer only if we hit the per-request limit, which we won't at launch volume.

Inside the Worker we add:

- One scheduled trigger (`cron = "*/2 * * * *"` during live GWs) that wakes, asks the `LiveGwDO` "what events fired since last tick?", and enqueues notifications.
- One HTTP route `POST /notify/subscribe` that takes a `PushSubscription` (browser-provided) plus a Supabase session JWT, validates the JWT against Supabase, and upserts the subscription row.
- One HTTP route `DELETE /notify/subscribe` for client-side unsubscribe.
- (Phase 2) `POST /notify/test` behind `is_pro` for the "send me a test" button.

### 6.2 Supabase schema

```sql
-- docs/supabase/00X_push.sql
create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  platform text not null check (platform in ('web', 'ios', 'android')),
  -- For web: the JSON-serialized PushSubscription (endpoint + p256dh + auth).
  -- For ios/android: the Expo push token (ExponentPushToken[...]).
  endpoint_or_token text not null,
  -- Stored separately so we can index/match without parsing JSON every fan-out.
  endpoint_host text generated always as (
    case when platform = 'web'
      then split_part(split_part(endpoint_or_token, '://', 2), '/', 1)
      else null
    end
  ) stored,
  -- Free-form JSON, parsed at send time. Stored once at subscribe time.
  payload_keys jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  unique (user_id, endpoint_or_token)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

create table public.notification_prefs (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  price_drop boolean not null default false,
  captain_scored boolean not null default false,
  rank_swing boolean not null default false,
  bonus_confirmed boolean not null default false,
  deadline boolean not null default true,
  -- Optional thresholds: watchlist price drops always, rank swings only > N.
  rank_swing_threshold int not null default 5000,
  updated_at timestamptz not null default now()
);

-- Audit + click-through analytics + dedup window.
create table public.notification_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  payload jsonb not null,
  sent_at timestamptz not null default now(),
  delivered_status text, -- 'ok' | 'gone' | 'rate-limited' | 'server-error'
  clicked_at timestamptz
);

create index notification_log_user_sent_idx on public.notification_log(user_id, sent_at desc);
create index notification_log_type_sent_idx on public.notification_log(type, sent_at desc);
```

RLS:

- `push_subscriptions`: user can `select` / `insert` / `delete` their own rows. Service role (Worker, via `getSupabaseAdminClient` equivalent — actually a `service_role` key bound as a Worker secret) bypasses RLS to read all rows during fan-out.
- `notification_prefs`: user can `select` / `update` their own row. Default row created lazily on first save.
- `notification_log`: user can `select` their own rows (for an in-app history view, post-launch). Only service role can `insert`.

Subscription rows that return `410 Gone` from the push service get deleted on the spot in the fan-out loop — that's the spec'd contract.

### 6.3 What triggers a send

| Event           | Source of truth                                                               | Wake mechanism                                                                                                                |
| --------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Price drop      | `apps/worker/src/prices.ts` — price-change predictor runs on `*/15 * * * *`.  | After each prices refresh, diff vs last KV snapshot; for each manager whose `watchlist` intersects the changed-set, enqueue.  |
| Captain scored  | `LiveGwDO` live tick (every 60s during GWs).                                  | DO emits a "captain returned ≥ X points in last tick" event into KV; cron drains and fans out.                                |
| Big rank swing  | `LiveGwDO` live tick — compares each tracked entry's `liveRank` vs last tick. | Same drain pattern as captain.                                                                                                |
| Bonus confirmed | FPL bootstrap-static `data_checked: true` flips during the tick.              | Cron checks each finished fixture's `provisional_bonus` → confirmed; one notification per manager whose XI contributed bonus. |
| GW deadline     | Static: 2h and 30m before each GW deadline (from `events[].deadline_time`).   | A separate cron (`0 * * * *`) scans for upcoming deadlines and enqueues a one-shot.                                           |

"Enqueue" at this scale = write into a per-user KV list keyed by `notify:queue:{userId}`. The dispatch cron drains every 2 min, signs, sends, logs. We avoid Cloudflare Queues at launch — KV + cron is enough for 12k/GW.

## 7. Events worth notifying on

| Event                | User value                                          | Send volume / Pro user / GW | Marginal cost / send (rough)  | Confidence we can ship it well                                             |
| -------------------- | --------------------------------------------------- | --------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| GW deadline reminder | Avoidable disaster prevention.                      | 1                           | ~$0.0000005 (Worker CPU + KV) | High — fixed-time, no detection logic.                                     |
| Captain returned     | The feeling we're selling.                          | 1–2                         | same                          | High — `LiveGwDO` already knows captains and live points.                  |
| Bonus confirmed      | Closes the "live points vs confirmed" anxiety loop. | 0–1                         | same                          | Medium — requires per-manager XI matching, ~3× Worker CPU vs captain.      |
| Big rank swing       | Engagement, but noisy.                              | 0–3 (gated by threshold)    | same                          | Medium — needs §6.2's `rank_swing_threshold` to avoid spam. Default 5,000. |
| Price drop watchlist | Differentiation vs livefpl.                         | 0–2                         | same                          | Medium — requires the watchlist feature, which is a soft dep.              |

**Recommendation: ship deadline + captain + bonus at MVP, gate rank swing and price drop on the existing features they need.** The four MVP events are the ones we can deliver well today; the other two should not be on the opt-in card until they're actually wired through.

A note on cost: even at 10× our launch projection (10k Pro users) we're still well inside the Worker paid plan ($5/mo) — push fan-out is one of the cheapest server-side operations in our stack. The real cost is **user attention**, which is why §3 caps the event set and defaults most types OFF.

## 8. iOS push (Expo, mobile post-launch)

### 8.1 Expo Push Service vs native APNs

**Recommendation: Expo Push Service.**

| Option                              | Pros                                                                                                            | Cons                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Expo Push Service**               | Free. One API for iOS + Android. Handles APNs token rotation. Battle-tested. Same endpoint shape in dev + prod. | Doesn't support APNs critical alerts or VoIP push. We don't need either.       |
| Native `apn` lib + `firebase-admin` | Total control over APNs critical/data-only flags.                                                               | Two SDKs to ship. Cert/key plumbing per env. No upside for what we're sending. |

Solo dev with finite weekend hours — the cost/effort math on Expo Push is overwhelming. We can switch to native later if a feature genuinely requires it (it won't).

### 8.2 Pete's Apple Developer Console steps (manual — automation can't do these)

These are gating dependencies. Block out 30 min for both consoles together when you start PR #6 (§13).

1. Sign in to https://developer.apple.com/account/. You need an active paid Apple Developer Program membership ($99/yr) — confirm it isn't expired.
2. Certificates, Identifiers & Profiles → **Identifiers** → confirm `com.simplyfpl.app` (already declared in `apps/mobile/app.json:18`) exists. If not, create it and enable the **Push Notifications** capability.
3. Certificates, Identifiers & Profiles → **Keys** → "+" → name `SimplyFPL Push Key`, check **Apple Push Notifications service (APNs)**, Continue, Register, **download the `.p8` file (once-only download, save it)**, note the **Key ID** and your **Team ID**.
4. https://expo.dev/accounts/<you>/projects/simplyfpl/credentials/ios → upload the `.p8`, paste Key ID + Team ID. Expo binds this to the bundle. **Token-based auth (one key) covers dev + prod.** Don't bother with the cert-based flow — Apple deprecated it for new integrations.

### 8.3 Dev vs prod

Token-based APNs auth eliminates the dev/prod cert split — the same key works against both APNs hosts. Expo routes to sandbox or production automatically based on whether the build is `expo-dev-client` / TestFlight / App Store. Nothing else for us to manage.

## 9. Android push (Expo)

### 9.1 Expo Push Service vs native FCM

**Recommendation: Expo Push Service**, same argument as iOS. One token endpoint, one library, one log.

### 9.2 Pete's Firebase Console steps (manual)

1. https://console.firebase.google.com/ → "Add project" → name "SimplyFPL". Disable Google Analytics (we have our own analytics path; FB Analytics adds another data-processor and isn't needed for FCM).
2. Add an Android app → package name `com.simplyfpl.app` (matches `apps/mobile/app.json:25`). Skip the SHA-1 for now; FCM doesn't require it.
3. Download `google-services.json`. Drop it into `apps/mobile/google-services.json` and **add the path to `.gitignore`**. (Build picks it up via the EAS Build Secret upload — _not_ via the repo.)
4. EAS dashboard → Project → Configuration → Secrets → upload `google-services.json` as a **file secret**.
5. https://expo.dev/accounts/<you>/projects/simplyfpl/credentials/android → grant Expo access to the FCM project, paste the FCM Server Key from Firebase Console → Project Settings → Cloud Messaging.

After both steps Expo can mint push tokens (`ExponentPushToken[...]`) the same way for both platforms; our backend doesn't branch on platform beyond storing it in `push_subscriptions.platform`.

### 9.3 What changes in `apps/mobile`

- `app.json` → add `"expo-notifications"` to `plugins`.
- New `packages/features/src/notifications/use-push-registration.ts` — registers for permission, gets token, calls Worker `POST /notify/subscribe`. Web and mobile share the same Worker endpoint; only the body shape differs (`{ platform: 'ios' | 'android', token }` vs `{ platform: 'web', subscription }`).

## 10. Privacy / GDPR

- **Lawful basis**: consent. Explicit, per-event-type, separated from any other consent (analytics, marketing). The opt-in card is the only place we ask.
- **Granularity**: each event type has its own checkbox in `notification_prefs`. Disabling one doesn't disable the others.
- **Revocation**: one button in `/settings` → DELETE on the subscription row + `pushManager.unsubscribe()` locally + a `notification_log` audit entry with `type: 'revoke'`. Same flow on mobile.
- **Retention**: `notification_log` rows older than 90 days dropped by a nightly Worker cron. Subscription rows that haven't been used in 180 days dropped at the same time (assume the user uninstalled / cleared site data).
- **Data sent off-platform**: push providers (Google Push, Apple APNs, Mozilla AutoPush) receive an encrypted payload they cannot decrypt; they see only the endpoint URL and the TTL. This is the standard web-push privacy model; we link to it from the consent text.
- **DPIA**: not required at this scale, but the data flow is documented above and that section is the start of one if/when we hit the threshold.

## 11. Security

- VAPID private key + Supabase service-role key live as **Worker secrets only** (`wrangler secret put`). Neither is ever sent to the client.
- Subscribe endpoint validates the Supabase JWT before writing. We don't accept anonymous push subscriptions (matches the goal in §3).
- We don't accept arbitrary `payload.url` from clients — the URL is always set server-side from a fixed deep-link table (`apps/worker/src/notify/deep-links.ts`). Prevents the trivial "phishing-via-push" attack.
- Rate limit `POST /notify/subscribe` to 5/min per IP. KV-based, same shape as the existing `apps/worker/src/passthrough.ts` rate limit.
- `notification_log` is **append-only**; only the dispatch path inserts. RLS deny on update/delete from any client.

## 12. Risks / open questions

- **Safari iOS adoption is gated on PWA install.** We accept this and design the opt-in copy around it.
- **Push delivery latency** for "captain scored" depends on (a) FPL's own data refresh, (b) our 60s tick, (c) the 2-min dispatch cron. Worst case ~3 min after the goal. Phase 2: lower the dispatch interval to 60s once we have one GW of fan-out volume data.
- **Notification fatigue.** Defaults in §6.2 are conservative; we should review opt-in/opt-out rates after the first month and tune defaults from real data, not from the table in §7.
- **Web-push library on Workers**. `web-push@3.x` runs under `nodejs_compat` but a future release could drop a Node-only dep. We pin the version and own the upgrade decision.
- **Quiet hours**. Not in MVP. We may add a 22:00–08:00 local-time mute once we have the data on user timezones from Supabase. Not blocking launch.

## 13. Concrete follow-up PRs

These are scoped to land in 1 day each (some less). Each PR branches off `dev` and targets `dev`.

1. **`feat/notifications-1-schema`** — add the three Supabase tables in §6.2 (`docs/supabase/00X_push.sql`), RLS policies, the retention cron Worker stub (no-op handler). Tests: SQL applies on a clean Supabase project; RLS unit test via `supabase-js` from a non-service role rejects writes.
2. **`feat/notifications-2-worker-routes`** — add `POST /notify/subscribe` and `DELETE /notify/subscribe` to the Worker, plus `web-push` dep + VAPID env var plumbing. Unit tests use MSW against the mocked push endpoint.
3. **`feat/notifications-3-web-sw-and-optin`** — add `/public/sw.js`, the `<NotificationsCard />` in `packages/ui` and the `useNotificationsOptIn()` hook in `packages/features`, wire into `/settings`. Feature flag: `NEXT_PUBLIC_FEATURE_PUSH`. Includes the `/live` banner. BDD scenario for the consent flow.
4. **`feat/notifications-4-dispatch-deadline`** — first real event type: GW deadline reminder. Worker cron + dispatch + log + click-through deep link. End-to-end smoke test from a test browser subscription.
5. **`feat/notifications-5-dispatch-captain-bonus`** — captain-returned + bonus-confirmed dispatchers. Hooks into `LiveGwDO`. Adds the captain/bonus toggles to the prefs UI.
6. **`feat/notifications-6-mobile-expo-push`** — `expo-notifications` plugin in `app.json`, `use-push-registration.ts` in `packages/features`, settings screen parity. **Blocked by Pete's Apple Developer + Firebase console steps in §8.2 + §9.2.**
7. **`feat/notifications-7-rank-swing-pricedrop`** — add the remaining two event types, gated on the rivals view and the watchlist features actually existing. Re-uses the dispatcher framework from PR #5.
8. **`chore/notifications-8-retention-quiet-hours`** — nightly cleanup of stale rows + optional quiet-hours preference.

A PR is in scope only if it lands behind the `FEATURE_PUSH` flag or it's the flag-flip PR itself. We do not flip the flag in prod until PR #5 has soaked on preview for one live GW.

## 14. Decisions Pete needs to make before kickoff

The RFC has opinions on each of these but each is reversible if we change our mind. Calling them out so they don't surface mid-PR.

- **Confirm Expo Push Service for mobile** (§8.1, §9.1). Default: yes.
- **Confirm `web-push` npm lib for web** (§5.5). Default: yes.
- **Confirm event set at MVP**: deadline + captain + bonus only (§7). Default: yes.
- **Confirm 5,000 as the rank-swing threshold default** (§6.2). Open to tuning from real data later.
- **Confirm Worker fan-out (not Supabase Edge Function)** (§6.1). Default: yes.
- **Decide Pro-only or also free with stricter caps** — RFC assumes Pro-only. If we change our mind, the only schema impact is dropping the `is_pro` check in the subscribe endpoint; everything else stays.
