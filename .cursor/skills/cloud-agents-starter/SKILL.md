---
name: cloud-agents-starter
description: Minimal first-run setup and practical test workflows for this codebase in Cursor Cloud (auth login, app start, feature flags, webhooks/workflows, and E2E).
---

# Cloud Agents Starter (Control Tower)

Use this skill when a Cloud agent needs to get productive immediately in this repo.

## 0) Fast bootstrap (do this first)

1. Install dependencies:
   - `bun install`
2. Create local env file:
   - `cp .env.example .env.local`
3. Set minimum required env values in `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SECRET`
   - `DATABASE_URL`
   - `TURSO_GROUP_AUTH_TOKEN` (if your DB URL requires auth)
   - `GAS_WEBHOOK_SECRET` (or `CRON_SECRET`) for webhook/bearer API testing
4. Run DB migrations:
   - `bun run db:migrate`
5. Start app:
   - `bun run dev`
6. Optional (workflow debugging with Inngest UI too):
   - `bun run dev:all`

## 1) Area: Auth + Dashboard UI (`app/(authenticated)`, `components/dashboard`)

### Practical login flow

1. Open `/sign-in`.
2. Sign in with a valid Clerk user.
3. Verify redirect to `/dashboard`.

### Quick manual smoke workflow

1. Open `/dashboard`.
2. Navigate to:
   - `/dashboard/applicants`
   - `/dashboard/workflows`
   - `/dashboard/risk-review`
3. Confirm no auth redirect loops and no visible server error page.

### If browser login is blocked

For server API routes that support bearer fallback, use:
- `Authorization: Bearer $GAS_WEBHOOK_SECRET`

This works for routes using `requireAuthOrBearer` (for example `/api/applicants/approval` and `/api/workflows/[id]/signal`).

## 2) Area: Workflow APIs + Webhooks (`app/api/**`, `inngest/**`)

### Create a workflow from webhook entrypoint

Use the lead-capture webhook (no seeded data needed):

- Set once: `APP_URL=<your-app-base-url>`
- `curl -X POST "$APP_URL/api/webhooks/lead-capture" -H "Content-Type: application/json" -d '{"companyName":"Cloud Agent Test Co","contactName":"Cloud Agent","email":"cloud-agent@example.com","phone":"+27110000000","industry":"Technology","employeeCount":10,"estimatedTransactionsPerMonth":1000,"secret":"'"$GAS_WEBHOOK_SECRET"'"}'`

This returns `applicantId` + `workflowId`.

### Signal workflow from API (bearer mode)

- `curl -X POST "$APP_URL/api/workflows/<workflowId>/signal" -H "Content-Type: application/json" -H "Authorization: Bearer $GAS_WEBHOOK_SECRET" -d '{"signalName":"qualityGatePassed","payload":{"source":"cloud-agent-test"}}'`

### Trigger external-style approval callback (bearer mode)

- `curl -X POST "$APP_URL/api/applicants/approval" -H "Content-Type: application/json" -H "Authorization: Bearer $GAS_WEBHOOK_SECRET" -d '{"workflowId":<workflowId>,"approved":true,"approver":"cloud-agent","comments":"manual test","decisionType":"quality_gate"}'`

### Contract-stage mocking (requires Clerk login/session)

For stage-5 contract handoff debugging:
- `POST /api/workflows/<workflowId>/absa/mock` with `{ applicantId, notes? }`
- This endpoint requires authenticated Clerk user (no bearer fallback).

## 3) Area: Feature flags + external-check behavior (`lib/services/agents/aggregated-analysis.service.ts`)

Keep local runs deterministic by default:

- `ENABLE_FIRECRAWL_INDUSTRY_REG=false`
- `ENABLE_FIRECRAWL_SANCTIONS_ENRICH=false`
- `ENABLE_FIRECRAWL_SOCIAL_REP=false`

Enable only when explicitly validating those integrations and keys are configured.

ProcureCheck toggle:
- `ENABLE_PROCURECHECK_LIVE=true|false` depending on whether live/sandbox behavior is desired.

Tip: restart `bun run dev` after changing env flags.

## 4) Area: E2E tests (`e2e/**`, `playwright.config.ts`)

### Standard suites (Clerk test user)

1. Create `.env.test` (for example copy `.env.local`).
2. Ensure:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `E2E_CLERK_USER_USERNAME`
   - `E2E_CLERK_USER_PASSWORD`
3. Run:
   - `bun run test:e2e`
4. Useful focused runs:
   - `bun run test:e2e --project="dashboard tests"`
   - `bun run test:e2e --project="workflow tests"`

### Local fallback workflow regression

Use isolated local DB utility (ephemeral test data only):

1. `bun run test:db:reset`
2. `set -a; source .env.local; set +a`
3. `CI=true PW_WEB_SERVER_PORT=3012 DATABASE_URL="file:$PWD/e2e/test.db" bun run test:e2e --project="workflow local fallback tests"`

## 5) Area: Build/lint gate (before handing off)

Always run:

1. `bun run build`
2. `bun run lint` (when changes touch app code or API logic)

## No-seeded-data guardrail

- Do not add committed seed scripts or persistent fixture data.
- For local/dev verification, create data via UI/API/webhooks or isolated ephemeral test utilities.

## Keep this skill updated (short runbook)

When you discover a new reliable testing trick or runbook step:

1. Add it under the closest area above (UI, API/workflows, flags, E2E, build gate).
2. Include:
   - exact command(s),
   - required env vars,
   - expected success signal (status code, UI outcome, or test output).
3. Prefer deterministic steps over ad-hoc debugging notes.
4. Remove stale steps as soon as flows/routes/env requirements change.
