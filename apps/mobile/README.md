# @simplyfpl/mobile

Expo app (React Native) — FPL companion on iOS and Android. Post-launch target; web is the primary surface for the initial release.

## Development

```sh
pnpm dev:mobile          # Expo Metro bundler
pnpm --filter mobile ios     # run on iOS simulator
pnpm --filter mobile android # run on Android emulator
```

Set `EXPO_PUBLIC_API_URL` to your Cloudflare Worker dev URL before starting:

```sh
EXPO_PUBLIC_API_URL=http://localhost:8787 pnpm dev:mobile
```

---

## Testing

### Unit / BDD tests (Vitest + vitest-cucumber)

```sh
pnpm --filter mobile test:unit
```

Tests live co-located with source files as `*.spec.ts`. They run in a `node` environment — no native renderer or device required. All FPL Worker calls are mocked via `globalThis.fetch` stubs; no real network calls are made.

#### Shared Gherkin feature files

Platform-agnostic `.feature` files are shared between `packages/features` (or `apps/web`) and mobile step definitions. Only the step definition files differ per platform.

**Locations:**

| Feature file                                    | Consumed by                                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `tests/shared-features/live-rank.feature`       | `apps/mobile/src/views/live-rank-dashboard.spec.ts`                                                       |
| `packages/features/src/rivals/rivals.feature`   | `packages/features/src/rivals/rivals.spec.ts` **and** `apps/mobile/src/views/rivals-view.spec.ts`         |
| `packages/features/src/h2h/compute-h2h.feature` | `packages/features/src/h2h/compute-h2h.spec.ts` **and** `apps/mobile/src/views/head-to-head-view.spec.ts` |

**Convention for cross-package feature paths:**

`loadFeature` in `@amiceli/vitest-cucumber` resolves paths that start with `./` relative to the calling spec file, and all other relative paths relative to the package CWD (i.e. `apps/mobile/`). Cross-package references therefore use a CWD-relative path:

```ts
// From apps/mobile/ (the package root, where vitest runs)
const feature = await loadFeature('../../packages/features/src/rivals/rivals.feature');
```

Mobile-local features use the standard co-located path:

```ts
const feature = await loadFeature('./leagues-view.feature');
```

---

### Maestro E2E flows (device / emulator)

Maestro cannot run in CI — it requires a physical device or simulator with an Expo dev build. The flows live in `.maestro/` at the repo root.

**Setup:**

1. Install [Maestro](https://maestro.mobile.dev/getting-started/installing-maestro) on your machine.
2. Start the Expo dev build:
   ```sh
   EXPO_PUBLIC_API_URL=http://localhost:8787 pnpm dev:mobile
   ```
3. Start the Worker in mock mode (or run `pnpm dev:worker`):
   ```sh
   pnpm dev:worker
   ```
   For Android emulator, replace `localhost` with `10.0.2.2`.
4. Install the dev build on your device/emulator via EAS or `expo run:ios` / `expo run:android`.

**Run a flow:**

```sh
# Single flow
maestro test .maestro/live-rank-dashboard.yaml

# All flows
maestro test .maestro/
```

**Flows and their source scenarios:**

| Maestro file                        | Source `.feature` scenario                                             |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `.maestro/live-rank-dashboard.yaml` | `live-rank-dashboard.feature` — entry snapshot → live rank display     |
| `.maestro/leagues-rivals.yaml`      | `leagues-view.feature` + `rivals.feature` — leagues tab → rivals board |
| `.maestro/head-to-head.yaml`        | `compute-h2h.feature` — H2H scoreboard from two team IDs               |

Each Maestro flow is named after and mirrors its source `.feature` scenario. The `.feature` file is the source of truth for observable behaviour; the Maestro YAML automates the UI path through that scenario on a real device.

**Mocking the API in E2E flows:**

The flows set `EXPO_PUBLIC_API_URL` to point at `localhost:8787` (or `10.0.2.2:8787` for Android). Run `pnpm dev:worker` to serve real FPL data via the local Cloudflare Worker proxy, or swap in a stub server that returns fixture data so flows are deterministic.

---

## Release runbook

Ordered path from a clean checkout to a TestFlight build and a Play internal
track upload. Run every command from the repo root unless it says otherwise.

### Preconditions

None of the steps below work until all of these are true.

| Must be true                                                              | How to confirm                                             |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Apple Developer Program membership is active                              | App Store Connect loads and shows the organisation         |
| Google Play developer account is verified                                 | Play Console opens without a "verification pending" banner |
| `apps/mobile/assets/` holds `icon.png`, `splash.png`, `adaptive-icon.png` | `npx expo-doctor` passes the config schema check           |
| The app record exists in App Store Connect and in Play Console            | Both consoles list bundle id `com.simplyfpl.app`           |
| `extra.eas.projectId` is set in `app.json`                                | `eas init` has been run once and committed the id          |
| The EAS `preview` and `production` environments hold the variables below  | `eas env:list --environment production`                    |
| An initial Android build has been uploaded by hand                        | Play requires the first `.aab` through the web UI          |

### Environment variables

`preview` and `production` builds read their values from the matching EAS
environment, not from a committed file. Nothing here is stored in the repo.

| Variable                        | Where the value comes from                                                        |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`           | Cloudflare dashboard, Workers, `simplyfpl-worker`, the route for that environment |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase dashboard, Project Settings, API, "Project URL"                          |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard, Project Settings, API, the `anon` / publishable key           |

Every `EXPO_PUBLIC_*` value is compiled into the JavaScript bundle and is
readable by anyone who downloads the app. The Supabase `anon` key is designed
for that and is protected by row level security. The Supabase `service_role`
key and the Stripe secret key are not, and must never be given an
`EXPO_PUBLIC_` prefix or added to any build profile.

Set a value with:

```sh
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value <value>
```

### Placeholders in `eas.json`

`submit.production` ships deliberately invalid `<<NAME>>` placeholders, so a
submit run against an unconfigured machine fails instead of uploading to the
wrong account. Replace each one locally and never commit the real value.

| Placeholder                         | Where the value comes from                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `<<APPLE_ID_EMAIL>>`                | The Apple ID email that holds the App Store Connect role                                                    |
| `<<ASC_APP_ID>>`                    | App Store Connect, the app, App Information, "Apple ID" (a numeric id, not the bundle id)                   |
| `<<APPLE_TEAM_ID>>`                 | developer.apple.com, Membership details, "Team ID" (10 characters)                                          |
| `<<PLAY_SERVICE_ACCOUNT_KEY_PATH>>` | Path to the Google Cloud service account JSON granted release access in Play Console, kept outside the repo |

### Steps

```sh
# 1. Clean checkout on the integration branch
git clone git@github.com:cteic/simply-fpl.git
cd simply-fpl
git checkout dev

# 2. Install and build the workspace packages the app imports
pnpm i
pnpm build:packages

# 3. Gate: these must all pass before a build is worth paying for
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm --filter @simplyfpl/mobile exec expo-doctor

# 4. One time only, and only when extra.eas.projectId is absent.
#    This writes the project id into app.json. Commit that change.
cd apps/mobile
eas init

# 5. iOS to TestFlight
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest

# 6. Android to the internal track
eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

`eas submit` reads `submit.production` from `eas.json`, so step 5 and step 6
fail immediately while the `<<NAME>>` placeholders are still in place. That is
the intended behaviour.

### After the upload

1. TestFlight processes the build for roughly 10 to 30 minutes before it is
   assignable to testers.
2. Play internal track releases need a release to be created and rolled out in
   Play Console before testers see the build.
3. Store listing copy, the privacy answers and the category live in
   `apps/mobile/store/listing.md`.
