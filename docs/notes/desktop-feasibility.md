# Desktop feasibility: PWA install vs Tauri v2

_Date: 2026-07-03 — relates to #391_

## Context

We want a desktop experience that reuses the existing Next.js shell with minimal extra maintenance surface. Two realistic options: PWA install (now shipping) and a Tauri v2 webview wrapper (evaluated here).

---

## Option A — PWA install (shipped in this PR)

The app is a Next.js SPA served over HTTPS. Adding a manifest + service worker makes it installable today via Chrome/Edge/Safari on macOS, Windows, and Linux. The browser's own install prompt appears; no native packaging is needed.

**Pros**

- Zero additional build or release tooling.
- Auto-updates happen transparently via the browser: every navigation picks up the latest deploy within one TTL cycle.
- Works on all platforms the browser targets — no per-OS code-signing or notarisation.
- No additional bundle to maintain; the same Cloudflare Pages deploy serves web and "desktop".
- Push notifications already work via the existing web push flow.

**Cons**

- No native menus, system tray, or OS-level notifications (beyond what web push gives us).
- App is not listed in the Mac App Store or Microsoft Store without extra packaging.
- Window chrome varies by browser; not 100% pixel-identical across installs.
- Offline capability is limited to the cached shell — live data requires a connection, which is already the product's reality.

**Verdict:** Recommended as the first desktop story. Covers ≥90% of user value for essentially zero ongoing cost.

---

## Option B — Tauri v2 webview wrapper

Tauri v2 ships a native shell (Rust) wrapping a system webview (WebKit/WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux) pointed at either the deployed URL or a bundled static export.

### Auto-update

Tauri v2 has a built-in `updater` plugin backed by a JSON update manifest (typically hosted on GitHub Releases or a CDN). The flow:

1. Build outputs a signed `.app.tar.gz` / `.msi` / `.deb`.
2. On launch, the app checks the updater endpoint.
3. If a newer version is available, it downloads and applies the update on next restart.

This means desktop releases are **decoupled from the web deploy**: a web push is instant; a Tauri update requires a new build + signed artifact + published manifest. For a solo dev, that is a meaningful ongoing overhead (~15–30 min per release cycle).

Pointing the webview at the deployed URL (rather than bundling a static export) sidesteps this — the app shell always loads the latest web deploy — but it then behaves identically to a PWA install, minus the benefit of the native shell.

### Apple notarisation

macOS requires every distributed `.app` outside the App Store to be:

1. Signed with a **Developer ID Application** certificate (requires Apple Developer Program membership — covered by #318).
2. **Notarised** by Apple's notarisation service (`xcrun notarytool`).
3. **Stapled** to the bundle before distribution.

This is a one-time setup per machine but an every-release step in CI. The GitHub Actions step takes ~2–5 min per release. If the CI runner is an ARM macOS runner (GitHub-hosted), it costs roughly $0.16/min — manageable but nonzero.

Windows code-signing is separate (EV certificate, ~$300/yr for OV or EV; Windows SmartScreen warnings appear without it). Linux packages can be distributed unsigned via `.deb`/`.AppImage`.

### Realistic sizing

| Task                                              | Estimate       |
| ------------------------------------------------- | -------------- |
| Scaffold Tauri v2 project, point at deployed URL  | 0.5 d          |
| CI pipeline for macOS `.dmg` + notarisation       | 1 d            |
| CI pipeline for Windows `.msi` + optional signing | 0.5–1 d        |
| Updater plugin wired to GitHub Releases           | 0.5 d          |
| Manual smoke-test on each platform                | 0.5 d          |
| **Total**                                         | **2.5–4 days** |

Beyond initial setup, each release cycle adds ~30 min (build, sign, publish manifest). That cost is low per release but accumulates across the season.

### What Tauri adds over PWA

- Native menu bar and system tray (e.g. live rank in menu bar — a genuinely compelling feature).
- OS-level file system access (not needed today).
- Native notifications without the browser push permission flow.
- Distributable via Homebrew tap or Winget (discoverability).

None of these are blockers for launch. The menu-bar live-rank feature is the most user-visible differentiator and would require Tauri-specific code (a Rust plugin or `@tauri-apps/plugin-shell`).

---

## Go / No-go

**Now: Go on PWA install.** It ships today, requires zero ongoing overhead, and satisfies the core "install on desktop" ask for most users.

**Post-launch: Conditional go on Tauri v2**, if there is clear demand for the menu-bar rank widget or if we decide to list on the Mac App Store. The Apple Developer account from #318 is a prerequisite; notarisation is then straightforward. The right time to evaluate is after launch data shows whether users are asking for a native feel vs just wanting a standalone window (which PWA already gives them).

**Electron: Skip.** Bundle size (~150 MB), Chromium shipping overhead, and no user-facing advantage over Tauri for this app.
