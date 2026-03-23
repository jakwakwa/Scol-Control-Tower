---
name: browser-flow-test-runner
description: Runs and debugs the stage-based browser-flow suite (stages 1-6) with role-based Clerk auth and active Inngest runtime. Use when the user asks to run browser-flow tests, validate stage transitions, verify stage 5-6 approvals, troubleshoot stuck runs, or re-seed isolated stage data.
---

# Browser-Flow Test Runner

Use this skill to execute and troubleshoot the `tests/browser-flow` suite reliably.

## Preconditions

1. Ensure role credentials exist in `.env.test` (preferred) or `.env.local`:
   - `E2E_CLERK_AM_USERNAME`
   - `E2E_CLERK_AM_PASSWORD`
   - `E2E_CLERK_RISKMANAGER_USERNAME`
   - `E2E_CLERK_RISKMANAGER_PASSWORD`
2. Start the app + Inngest runtime together:
   - `bun run dev:all`
3. Run quick browser verification before tests:
   - `agent-browser open http://localhost:3000`
   - `agent-browser wait --load networkidle`
   - `agent-browser eval 'document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay") ? "ERROR_OVERLAY" : "OK"'`
   - `agent-browser eval 'document.body.innerText.trim().length > 0 ? "HAS_CONTENT" : "BLANK"'`
   - `agent-browser close`

## Standard Runs

- Stage-by-stage:
  - `bun run test:browser:stage1-3`
  - `bun run test:browser:stage4`
  - `bun run test:browser:stage5-6`
- Full stack:
  - `bun run test:browser-flow-full`

## Seeded Isolated Runs

Use this when stage scripts are run independently (without relying on a fresh stage1-3 handoff).

1. Seed data:
   - `bun run test:db:seed:browser-flow`
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
