---
description: 
alwaysApply: true
---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StratCol Onboard Control Tower** is an event-driven onboarding automation platform. Applicants are captured via Google Forms/Apps Script webhooks, processed through a 6-stage pipeline, and managed through risk assessment, document verification, sanctions checks, and contract workflows — all without middleware.

## Package Manager

Use **`bun` only**. Never use `npm`, `yarn`, `pnpm`, or `npx`. Use `bunx` for global installations.

## Common Commands

```bash
bun dev                        # Start Next.js dev server (Turbo)
bun run build                  # Production build
bun run lint                   # Biome linter
bun run lint:fix               # Auto-fix lint issues

# Database
bun run db:generate            # Generate Drizzle migrations
bun run db:migrate             # Run migrations
bun run db:studio              # Open Drizzle Studio UI
bun run db:reset               # Drop all tables and re-migrate

# E2E / Browser Tests
```
bun run test:browser-flow-full 
```

## Architecture

### Request Flow

1. **Ingestion**: Google Apps Script POSTs to `/api/webhooks/lead-capture`
2. **Orchestration**: API sends Inngest events → `inngest/functions/control-tower-workflow.ts` runs the pipeline
3. **Verification**: Workflow steps call OpenSanctions, ProcureCheck, Firecrawl, and AI agents
4. **Callbacks**: External events (contract signed, agent decisions) arrive via webhooks and advance the workflow — no polling

### 6-Stage Pipeline (`inngest/functions/control-tower/`)

| Stage | Purpose |
|-------|---------|
| Stage 1 | Lead intake, basic validation |
| Stage 2 | Facility application, quote generation |
| Stage 3 | FICA docs, document verification, sanctions, ProcureCheck |
| Stage 4 | Risk assessment, kill switch, escalation logic |
| Stage 5 | Contract signing, ABSA gate |
| Stage 6 | Final approval, account activation |

### Key Directories

- `app/` — Next.js App Router; `(authenticated)/` for dashboard, `(unauthenticated)/` for public forms and uploads
- `app/api/` — 46 API routes: webhooks, onboarding, FICA, risk, sanctions, quotes, contracts, documents, inngest, callbacks
- `inngest/` — Event orchestration: workflow definitions, functions, event types
- `lib/services/` — Core business logic: agents, document handling, risk, verification
- `lib/services/agents/` — AI agents: validation, risk, sanctions, reporter, financial-risk
- `db/schema.ts` — Single-file Drizzle schema (all tables)
- `components/` — `dashboard/`, `forms/`, `emails/`, `ui/` (shadcn), `shared/`, `layout/`
- `actions/` — Next.js server actions
- `tests/` —  E2E browser flow tests
- `scripts/` — DB reset/seed scripts, PostHog dashboard creation

### Database Schema (Turso/LibSQL via Drizzle)

Key tables: `applicants`, `documents`, `workflows`, `risk_flags`, `sanctions_checks`, `quotes`, `contracts`, `notifications`, `form_submissions`, `audit_logs`.

Important `applicants` fields:
- `businessType`: `NPO | PROPRIETOR | COMPANY | TRUST | BODY_CORPORATE | PARTNERSHIP | CLOSE_CORPORATION`
- `status`: `new | stage1 | stage2 | ... | stage6 | completed | rejected`
- `riskLevel`: `green | amber | red`
- `sanctionStatus`: `clear | flagged | confirmed_hit`
- `escalationTier`: `1` (normal) | `2` (manager alert) | `3` (salvage)

### AI Agents

Multiple Gemini-powered agents in `lib/services/agents/`:
- **Validation Agent** — validates documents and applicant data
- **Risk Agent** — assesses risk level
- **Sanctions Agent** — cross-references sanctions lists
- **Reporter Agent** — generates compliance reports
- **Financial-Risk Agent** — analyzes ITC score

### Verification Services

- **OpenSanctions** — sanctions checks
- **ProcureCheck** — entity verification
- **Firecrawl** — web-based industry registration validation (behind `ENABLE_FIRECRAWL_INDUSTRY_REG` flag)
- **Google Document AI** — ID document verification for FICA

### PostHog Telemetry

The app uses a "Perimeter Validation" framework. Key files:
- `lib/posthog-server.ts` — server-side PostHog client
- `instrumentation-client.ts` — client-side instrumentation
- `lib/config/perimeter-validation.ts` — perimeter config
- `lib/services/telemetry/` and `perimeter-metrics.ts` — telemetry services

The key event is `perimeter_validation_attempt` with properties: `env`, `perimeter_id`, `schema_version`, `result`, `reason_code`, `sampling_weight`.

## Code Style

- **Formatter/Linter**: Biome — tabs, 90-char line width, strict correctness and security rules
- **TypeScript**: Strict mode, `ESNext` target, path alias `@/*` maps to project root, no any or unkown types
- **No `console.log`**: Only `console.assert`, `console.warn`, and `console.error` are allowed

## Environment Setup

Copy `.env.example` to `.env.local`. Minimum required:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- `TURSO_ORG`, `TURSO_API_TOKEN`, `TURSO_DATABASE_NAME`, `DATABASE_URL`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `GOOGLE_GENAI_KEY`
- `OPENSANCTIONS_KEY`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

For E2E tests: `E2E_CLERK_*` credentials in `.env.test`. Tests inject a separate test database; always run `db:reset:test` against the test DB
## Key Reference Files

- `docs/posthog-perimeter-dashboard.md` — PostHog dashboard docs
- `docs/rollout-plans/inngest-perimeter-validation-rollout.md` — Inngest perimeter rollout
- `.agents/skills/` — domain-specific skill files (PostHog instrumentation, Inngest middleware, ProcureCheck API, etc.)
