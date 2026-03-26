---
name: browser-flow-test-runner
description: Runs and debugs the stage-based browser-flow suite (stages 1-6) with role-based Clerk auth and active Inngest runtime. Use when the user asks to run browser-flow tests, validate stage transitions, verify stage 5-6 approvals, troubleshoot stuck runs, or re-seed isolated stage data.
---

# Browser-Flow Test Runner

Use this skill to execute and troubleshoot the `tests/browser-flow` suite reliably.

## Preconditions

1. **Test database**: `.env.test` must define `TEST_DATABASE_URL` and `TEST_TURSO_GROUP_AUTH_TOKEN` (see `.env.test.example`). Optional `TEST_TURSO_DATABASE_NAME` / `TEST_TURSO_API_TOKEN` are for Turso CLI only. Browser-flow uses `TEST_DATABASE_URL` when `E2E_USE_TEST_DB=1`.
2. **Clerk**: Role credentials in `.env.test` (preferred) or `.env.local`:
   - `E2E_CLERK_AM_USERNAME` / `E2E_CLERK_AM_PASSWORD`
   - `E2E_CLERK_RISKMANAGER_USERNAME` / `E2E_CLERK_RISKMANAGER_PASSWORD`
3. **Test schema**: `dev:browser-flow` runs `db:push:test` (Drizzle push from `db/schema.ts`, test Turso only — do not edit migration SQL). Nuclear option: `bun run test:db:reset` (drop all tables + push).
4. **Start the browser-flow stack** (Next + Inngest on **port 3100** by default, test DB):
   - `bun run dev:browser-flow`
   - Do **not** rely on `bun run dev` alone for these scripts; it uses `DATABASE_URL` from `.env.local`, so you would see dev data instead of the test DB.
   - Everyday dev + Inngest on **3000** remains: `bun run dev:all`.
5. **Point tests at the running app** (default `http://localhost:3100` — avoids Next 16 dev cross-origin blocks on `/_next/*` when the browser uses `127.0.0.1`):
   - Override with `BASE_URL` or `BROWSER_FLOW_BASE_URL`, or set `BROWSER_FLOW_PORT` (default `3100`).
6. **Env load order**: `dev:browser-flow` and stage scripts load **`.env.test` then `.env.local`** so **Clerk keys from `.env.local` always win**. Putting `.env.test` second used to overwrite `CLERK_*` and caused Clerk “infinite redirect / keys do not match” errors.
7. **Preflight** (runs automatically before each `test:browser:*` command): `bun run test:browser:preflight` checks required env vars and that `/sign-in` responds on `localhost:${BROWSER_FLOW_PORT}`.
8. Quick browser smoke (adjust port if needed):
   - `agent-browser open http://localhost:3100`
   - `agent-browser wait --load networkidle`
   - `agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"'`
   - `agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"'`
   - `agent-browser close`

## Standard Runs

With `dev:browser-flow` running (open **`http://localhost:3100`** in the browser; scripts default to that host):

- Stage-by-stage:
  - `bun run test:browser:stage1-3`
  - `bun run test:browser:stage4`
  - `bun run test:browser:stage5-6`
- Full stack:
  - `bun run test:browser-flow-full`

Screenshots use **1920×1080** viewport and **`--full`** (full page). Stage 4 captures all four risk report profile tabs (Procurement, ITC Credit, Sanctions & AML, FICA / KYC). Each stage script ends with a **`/dashboard/workflows`** capture.

## Stage 6 UI approvals (optional)

- Default: RM/AM approvals use `fetch` to `/api/onboarding/approve` (fast, stable).
- For button + toast evidence: `BROWSER_FLOW_UI_APPROVALS=1 bun run test:browser:stage5-6`

## Seeded Isolated Runs

Use this when stage scripts are run independently (without relying on a fresh stage1-3 handoff).

1. Seed data (writes to **`TEST_DATABASE_URL`** by default):
   - `bun run test:db:seed:browser-flow`
   - To seed the app DB instead: `BROWSER_FLOW_SEED_TARGET=app bun run scripts/seed-browser-flow-test-data.ts`
2. Remove stale handoff file if needed:
   - `tests/browser-flow/.applicant-id`
3. Run isolated stages:
   - `bun run test:browser:stage4`
   - `bun run test:browser:stage5-6`

`stage4.sh` reads `stage4ApplicantId` and `stage5-6.sh` reads `stage56ApplicantId` from `tests/browser-flow/.seed-output.json` when `APPLICANT_ID` is not set.

## Timeout + Poll Pattern (avoid infinite loops)

1. Run each command once with a fixed timeout.
2. If the command backgrounds, inspect terminal output after timeout.
3. Do not re-run in loops without new evidence.

When reporting, include:
- pass/fail per stage command
- key API evidence (`workflowId`, `bothApproved`, `stage`)
- screenshot path(s) under `tests/browser-flow/screenshots`

## Stage 5-6 Acceptance Signals

- RM and AM approvals both return success via `/api/onboarding/approve`.
- Approval status endpoint shows:
  - `bothApproved: true`
  - `stage: 6`
- Script exits `0` and writes final screenshots.

## Final Verification Before Claiming Success

Run compile-time verification:

- `bun run build`

Only report success after both:
- runtime browser-flow checks pass
- compile-time build passes
