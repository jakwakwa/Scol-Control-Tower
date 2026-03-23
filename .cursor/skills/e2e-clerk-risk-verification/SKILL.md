---
name: e2e-clerk-risk-verification
description: Verifies UI and auth flows with Playwright, Clerk testing patterns, and agent-browser before claiming a fix is done. Loads workspace E2E skills, uses E2E_CLERK_RISK_MANAGER_USERNAME and E2E_CLERK_RISK_MANAGER_PASSWORD (or documents missing env). Use when the user asks for verification, proof in the browser, E2E checks, dashboard smoke tests, or when completing features that touch Clerk or protected routes.
---

# E2E + Clerk verification (Risk Manager)

## When this applies

Use this skill whenever you are about to say a change **works**, **passes**, or is **ready**, and the surface area includes:

- Authenticated dashboard or applicant flows
- Clerk sign-in / org context
- Risk-manager permissions (`org:risk_manager`, risk review, green lane, kill switch, two-factor approval)

Do **not** treat compile-only checks or public pages alone as sufficient proof for these flows.

## Load these skills first

Read and follow as relevant:

| Skill | Path |
| ----- | ---- |
| Clerk + Playwright | `.agents/skills/clerk-testing/SKILL.md` |
| Playwright structure, flakiness, console | `.agents/skills/playwright-best-practices/SKILL.md` |
| agent-browser CLI | `~/.agents/skills/agent-browser/SKILL.md` |

Project conventions: `AGENTS.md` (bun, `bun run test:e2e`, test DB behavior).

## Credentials (Risk Manager)

Prefer these variables when signing in as a **risk manager** test user:

- `E2E_CLERK_RISK_MANAGER_USERNAME` — Clerk identifier (username or email, whichever that user uses to sign in)
- `E2E_CLERK_RISK_MANAGER_PASSWORD`

**Repo default E2E user** (used by existing Playwright setup): `E2E_CLERK_USER_USERNAME` or `E2E_CLERK_USER_EMAIL`, plus `E2E_CLERK_USER_PASSWORD` (see `.env.test.example`, `e2e/tests/global.setup.ts`). Use the `USER_*` pair when running the stock suite unchanged; use the `RISK_MANAGER_*` pair when the scenario requires risk-manager-only permissions.

Never paste secret values into chat; redact passwords in logs.

## Verification order

1. **Compile**: `bun run build` (and `bun run lint` if the task touched TS/TSX).
2. **Automated E2E**: `bun run test:e2e` with `.env.test` populated. Playwright injects the test database; do not manually point tests at dev/prod DB.
3. **Browser proof** (when E2E does not cover the path, or the user asked for interactive verification):
   - **Playwright**: extend or run a spec that signs in and hits at least `/dashboard` and a representative deep route (e.g. `/dashboard/applicants/new` or the route under test). Attach `page.on('console')` and fail on unexpected app errors (allow-list known third-party noise).
   - **agent-browser**: if Playwright is awkward for a one-off, drive the same signed-in routes with the CLI; load identifier/password from env (`E2E_CLERK_RISK_MANAGER_USERNAME` / `E2E_CLERK_RISK_MANAGER_PASSWORD` or the `E2E_CLERK_USER_*` vars). Do not commit saved auth state files.

## Clerk testing reminders

- Use **test** Clerk keys only (`pk_test_*`, `sk_test_*`).
- Follow Clerk’s Playwright flow: `clerkSetup()`, `setupClerkTestingToken()` before auth UI, `storageState` where the project already uses it (see official Clerk Playwright docs linked from `clerk-testing`).

## Success criteria (report explicitly)

State what you ran and the outcome:

- [ ] `bun run build` — pass/fail
- [ ] `bun run test:e2e` — pass/fail/skipped with reason
- [ ] Signed-in browser verification — which tool, which routes, console clean (exceptions noted)
- [ ] Env: confirmed `E2E_CLERK_RISK_MANAGER_*` or `E2E_CLERK_USER_*` present for the run, or documented as missing/blocking

## Anti-patterns

- Claiming dashboard or risk flows work after only visiting `/` or `/sign-in`.
- Using **bunx** for installs/runs in this repo — use **bun** per `AGENTS.md`.
- Running E2E against a shared dev/prod `DATABASE_URL` in `.env.test`.

## Optional: wire Risk Manager vars into Playwright

If the suite should default to a risk-manager user, add `E2E_CLERK_RISK_MANAGER_USERNAME` and `E2E_CLERK_RISK_MANAGER_PASSWORD` to `.env.test.example` and read them in setup — only when a maintainer explicitly wants that change; this skill does not require it.
