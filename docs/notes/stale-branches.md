# Stale Branch Report

**Run date (UTC):** 2026-06-11

**Total stale branches:** 13 (no push in 30+ days, no open PR)

| Branch                            | Last-commit date | Age (days) | Last-commit subject                                                    |
| --------------------------------- | ---------------- | ---------- | ---------------------------------------------------------------------- |
| `chore/pr-template`               | 2026-04-29       | 42         | chore: add pull request template                                       |
| `chore/seed-cleanup`              | 2026-04-29       | 42         | chore: passWithNoTests for vitest in packages without tests yet        |
| `chore/upgrade-wrangler-v4`       | 2026-04-29       | 42         | fix(ci): stream wrangler output via tee so failures are visible        |
| `chore/worker-kv-ids`             | 2026-04-29       | 42         | chore(worker): set real KV namespace IDs in wrangler.toml              |
| `feat/demo-route-and-public-home` | 2026-05-02       | 39         | feat(web): FPL ID onboarding after magic-link sign-in                  |
| `feat/home-search-and-nav-auth`   | 2026-05-02       | 39         | chore: prettier reflow in demo/page.tsx                                |
| `feat/home-uses-profile-entry-id` | 2026-05-02       | 39         | fix(web): edge runtime on /auth/callback for Cloudflare Pages          |
| `feat/onboarding-fpl-id`          | 2026-05-02       | 39         | feat(web): home reads fpl_entry_id from profile when signed in         |
| `feat/planner-real-data`          | 2026-05-02       | 39         | fix(web): edge runtime on /auth/callback for Cloudflare Pages          |
| `feat/supabase-auth-leagues`      | 2026-05-02       | 39         | feat(web): home FPL ID search + nav auth wiring                        |
| `feat/tamagui-design-system`      | 2026-05-02       | 39         | fix(ci): add wrangler to apps/web so Pages deploy can find it          |
| `fix/ci-pnpm-version-conflict`    | 2026-04-29       | 42         | fix(ci): remove pnpm version arg, use packageManager from package.json |
| `fix/edge-runtime-dynamic-routes` | 2026-04-29       | 42         | fix(web): declare edge runtime on /rank/[entryId] for Pages deploy     |

To delete: `git push origin --delete <branch-name>` or use the GitHub UI → Branches.
