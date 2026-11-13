# Contributing to SimplyFPL

This document describes how work flows through the repo: how issues are tracked, how PRs link to them, branching, and PR hygiene. It applies to humans and AI agents alike.

## Issue tracking

### Workstream prefixes

Big efforts get an RFC in `docs/rfcs/NNN-slug.md` and a numbered ticket prefix on the issue title:

```
[SC-01] Decision: keep livefpl as the comparison target
[SC-02] Add Browser Rendering + R2 bindings to worker
...
[LF-04] Live snapshot polling + broadcast loop
```

Prefix maps 1:1 to the workstream label and the RFC. Read the RFC, then `gh issue list --label <workstream>` to see the full plan.

### Labels (multi-axis)

Labels are dimensions, applied in combination on one issue:

- **Area**: `web`, `worker`, `mobile`, `infra`, `auth`, `payments`, `backend`, `features-pkg`
- **Workstream**: `live-fanout`, `rivals-view`, `speed-comparison` — one per RFC
- **Size**: `size-s` (half day), `size-m` (1–2 days), `size-l` (3–5 days)
- **Status**: `blocked`, `quick-win`
- **Stock**: `bug`, `enhancement`, `documentation`, `incident`

A typical issue might carry `web + speed-comparison + size-m`. Filter `is:open label:speed-comparison` to see one workstream end-to-end.

### Incidents become issues

When prod breaks, the fix PR creates an incident issue _first_ (`gh issue create --label incident`), then `Closes #N`. That leaves a permanent record outside the PR description.

## Branching (simplified GitFlow)

- `main` is production. Auto-deploys to Cloudflare Workers (web + API worker) on push.
- `dev` is the integration branch and the **default branch**. PRs target `dev`.
- Feature branches branch from `dev`. Naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
- Releases are PRs `dev → main` merged with a **merge commit** (preserves per-feature history). Tag the merge commit on main `v0.X.0`.
- After a release lands on main, the next PR to dev should include a `chore: sync main into dev` merge.
- Hotfix exception: a true production hotfix can branch off `main` and PR to `main`, then cherry-pick back to `dev`. Use sparingly.

Branch protection isn't enforced via GitHub (repo is private on Free tier). Discipline replaces enforcement: don't direct-push to `main`, don't force-push either branch, don't delete `main` or `dev`.

## Every PR is linked

`.github/pull_request_template.md` forces every PR to declare one of:

- `Closes #N` — fully resolves a tracked issue
- `Refs #N` — partially addresses a multi-part issue (leave a cross-reference comment on the issue rather than closing)
- `Type: bug fix (ad-hoc, no linked issue)` or `Type: chore / cleanup (no linked issue)` — explicit "no link"

The why: reviewers know at a glance whether work was tracked or ad-hoc. No silent scope creep.

## PR hygiene

- **Title**: conventional commit prefix — `feat(web): ...`, `fix(worker): ...`, `chore(infra): ...`, `docs(rfc): ...`. Under 70 characters.
- **Body**: summary bullets only. No "Test Plan" section. No AI-generated footer. No `Co-Authored-By: Claude` trailer.
- **Linked issue**: fill in the template slot — `Closes #N`, `Refs #N`, or a `Type:` tag.
- **Tests**: every new user-facing feature needs a `.feature` scenario plus step definitions. Bug-fix PRs need a regression test that fails without the fix. See the Testing section in `CLAUDE.md`.

### After opening a PR

1. **Assign Pete** so it lands on his dashboard:
   `gh pr edit <N> --add-assignee pete-watters`
   (GitHub rejects self-review requests; assignment is the visibility signal.)
2. **Post a status comment** opening with `@pete-watters` and using this shape:
   - **Shipped** — bullets of what landed
   - **Pending / decisions needed** — anything Pete should look at, blockers, open questions
   - **Verification** — confirm `pnpm typecheck / lint / format / build` clean; list any manual steps (env vars, services to sign up for, smoke-test URLs, migrations)

This applies to PRs from any session — local CLI work AND scheduled remote agents.

## Verification

Run after any code change:

```
pnpm format
pnpm lint
pnpm typecheck
```

Per-package:

```
pnpm --filter @simplyfpl/<pkg> typecheck
pnpm --filter @simplyfpl/<pkg> lint
```

The pre-commit hook (`.husky/pre-commit`) runs `pnpm exec lint-staged` — formats only staged files (~1s) and re-stages them. The pre-push hook (`.husky/pre-push`) runs `pnpm format:check` against the whole repo as a final gate before code leaves the laptop. Extra checks opt in via `PRE_COMMIT=typecheck,lint` or `PRE_PUSH=typecheck,lint,test:unit` in `.env`.

## RFCs

Non-trivial workstreams get an RFC in `docs/rfcs/NNN-slug.md` before the first ticket is opened. RFCs cover:

- Goal + user-facing outcome
- Current state
- Architecture / data flow
- Failure modes + fallbacks
- Phased delivery
- Open questions

The RFC is the single source of truth for the workstream — issues reference it by section, not by paraphrasing.

## Reference

- `CLAUDE.md` — full project + AI-agent instructions
- `packages/ui/DESIGN_SYSTEM.md` — visual identity reference
- `SKILLS.md` — animation conventions
- `docs/rfcs/` — workstream specs
