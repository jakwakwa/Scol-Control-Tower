# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use **Bun** for all package operations — never npm, pnpm, or yarn.

```bash
bun dev                        # Next.js dev server (Turbo)
bun run dev:all                # Full stack dev (Next + Inngest)
bun run inngest:dev            # Inngest dev server only
bun run build                  # Production build
bun run lint                   # Biome lint
bun run lint:fix               # Biome lint with auto-fix

# Database
bun run db:generate            # Generate Drizzle migrations
bun run db:migrate             # Apply migrations to dev DB
bun run db:reset               # Drop dev + test DBs and re-apply migrations
bun run db:studio              # Drizzle Studio UI
bun run test:db:reset          # Reset test DB only

# E2E tests (Playwright)
bun run test:e2e               # Run all Playwright tests
bun run test:e2e:ui            # With interactive UI
bun run test:e2e:debug         # With debugger

# Browser-flow automation (multi-stage)
bun run dev:browser-flow       # Start browser-flow dev stack (port 3100)
bun run test:browser:stage1-3  # Stages 1–3
bun run test:browser:stage4    # Stage 4
bun run test:browser:stage5-6  # Stages 5–6
bun run test:browser-flow-full # All stages
```

## Architecture

SCOL Control Tower is an **event-driven applicant onboarding platform** with a 6-stage pipeline and no middleware — webhooks hit Next.js directly.

### Data flow

1. **Ingestion** — Google Forms/Apps Script POSTs to `/api/webhooks/lead-capture`; Clerk events arrive at `/app/webhooks/`
2. **Orchestration** — The API sends Inngest events; `inngest/functions/control-tower-workflow.ts` runs the pipeline via `ControlTowerOrchestrator`
3. **6 stages** (`inngest/functions/control-tower/stages/`):
   - Stage 1: Intake & validation
   - Stage 2: Facility application & quote
   - Stage 3: Procurement, FICA, VAT verification (Firecrawl when enabled)
   - Stage 4: Kill-switch guard
   - Stage 5: Contract wait (ABSA gate)
   - Stage 6: Final approval & activation
4. **Verification** — AI agents (`lib/services/agents/`) call OpenSanctions, ProcureCheck, XDS, and Google Gemini; results written to `riskAssessments` table
5. **Human escalation** — Workflow pauses at `awaiting_human` states; staff act via dashboard API routes; signals resume the workflow

### Key directories

| Path | Purpose |
|------|---------|
| `inngest/` | Event definitions, Inngest client, workflow functions |
| `inngest/functions/control-tower/` | Orchestrator, stage handlers, timeout handler |
| `lib/services/` | Business logic services (risk, sanctions, FICA, quote, email…) |
| `lib/services/agents/` | AI agents (validation, risk, sanctions, financial-risk, reporter) |
| `lib/ai/models.ts` | GoogleGenAI wrapper (PostHog-instrumented) |
| `db/schema.ts` | Drizzle schema — applicants, documents, riskAssessments, activityLogs, workflows |
| `app/api/` | 21 API endpoint categories |
| `app/(authenticated)/` | Protected dashboard routes |
| `app/(unauthenticated)/` | Public forms, sign-in/up |
| `components/` | UI components (Shadcn/Radix base in `ui/`, features in `dashboard/`) |
| `e2e/` | Playwright tests with Clerk auth state |
| `tests/browser-flow/` | Shell-script staged browser automation |
| `scripts/` | DB reset, seeding, PostHog dashboard utilities |

### AI models

`lib/ai/models.ts` exports two GoogleGenAI clients:
- `@posthog/ai` `GoogleGenAI` — for `models.generateContent` (PostHog-instrumented)
- `@google/genai` `GoogleGenAI` — for `interactions.create`

Model constants: `gemini-2.5-flash` (fast), `gemini-2.5-pro` (high-stakes), `gemini-2.5-flash-lite` (lightweight).

### Database

- **Turso (LibSQL)** remote database; `getDatabaseClient()` in `app/utils.ts` returns test DB when `E2E_USE_TEST_DB=1`
- Never hand-edit committed migration files. Use `bun run db:reset` to reset both DBs, or `bun run test:db:reset` for test DB only. `db:push:test` is available for ad-hoc schema sync without a migration file.
- Legacy tables `agents` and `xt_callbacks` have been removed from the schema.

### Testing

- **E2E (Playwright)**: Uses test DB via `E2E_USE_TEST_DB=1`; Clerk auth state saved to `playwright/.clerk/`; web server on port 3001 by default
- **Browser-flow**: `bun run dev:browser-flow` loads `.env.test`, sets `E2E_USE_TEST_DB=1`, runs on port 3100; seed with `bun run test:db:seed:browser-flow`; `BROWSER_FLOW_UI_APPROVALS=1` enables button-driven Stage 5–6 approvals
- Applicant detail URLs support `?tab=` values: `overview`, `documents`, `forms`, `risk`, `reviews`
- Risk review (`/dashboard/risk-review/reports/[id]`) has four client-side tabs (Procurement, ITC Credit, Sanctions & AML, FICA/KYC) — no URL params; use full-page screenshots per tab for automation

## Rules

- **No `git commit` or `git push`** unless the user explicitly asks
- **No `any` in TypeScript** — strict typing enforced by Biome
- **Server Actions must authenticate internally** — treat them like public API endpoints; call `requireAuth()` inside each action, not only in layouts or middleware
- **Applicant intake APIs are contractual** — breaking changes to `app/api/applicants`, applicant forms, or mandate-related validations require explicit user approval
- **Browser-flow verification required** before marking dashboard or dev-server work complete
- **Inngest steps must be replay-safe** — deterministic logic only; side effects belong inside `step.run()`
- **PostHog CSP**: `connect-src` in `next.config.mjs` must include `https://*.posthog.com`
- **`performAggregatedAnalysis`** (`lib/services/agents/aggregated-analysis.service.ts`) is exported but not wired into active Inngest stages — individual agent calls are used in the pipeline instead

## Feature flags (env)

| Flag | Default | Controls |
|------|---------|---------|
| `ENABLE_FIRECRAWL_INDUSTRY_REG` | `true` | Industry-reg Firecrawl check |
| `ENABLE_FIRECRAWL_SOCIAL_REP` | `false` | Social-reputation Firecrawl check |
| `ENABLE_MANUAL_FIRECRAWL_SCREENING` | `false` | Manual sanctions enrichment |
| `ENABLE_FIRECRAWL_VAT_VERIFICATION` | `false` | Firecrawl VAT check (Stage 3) |
| `ENABLE_XDS_ITC` | `false` | XDS ITC credit check |
