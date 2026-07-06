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
