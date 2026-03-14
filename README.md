# StratCol Onboard Control Tower

**StratCol Onboard Control Tower** (SCOL Watchtower) is an event-driven onboarding automation platform that manages applicant lifecycles, risk assessment, sanctions checks, and contract workflows—without middleware. Capture sources (e.g. Google Forms / Apps Script) talk directly to the Next.js backend; orchestration and state live in [Inngest](https://www.inngest.com/) workflows.

## Features

- **Zero-Middleware**: Webhooks from Google Apps Script (or similar) hit the app directly; no Zapier or third-party orchestration.
- **6-Stage Control Tower**: Lead capture → Facility & quote → Procurement & FICA → Risk review → Contract (ABSA gate) → Final approval. Supports kill switch, parallel streams, and conditional document logic.
- **Event-Driven Workflows**: Inngest workflows react to domain events (`onboarding/lead.created`, `contract/signed`, agent callbacks, etc.).
- **Verification & Risk**: OpenSanctions (sanctions), ProcureCheck (entity verification), optional Firecrawl-backed checks, and AI agents (validation, risk, sanctions) with a Reporter Agent.
- **Direct Capture**: Secure endpoints such as `/api/webhooks/lead-capture` and `/api/webhooks/contract-signed` for form submissions and contract events.
- **Dashboard**: Shadcn/UI-based UI for applicants, workflows, agents, risk review, sanctions, notifications, and forms.

## Tech Stack

| Area | Technologies |
|------|--------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbo) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Package manager** | [Bun](https://bun.sh/) (recommended) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) (`pg-core`, `pg` driver) |
| **Auth** | [Clerk](https://clerk.com/) |
| **Background jobs** | [Inngest](https://www.inngest.com/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) |
| **Other** | Recharts, React Hook Form, Zod, Resend (email) |

## Architecture (high level)

1. **Ingestion**: Applicants are captured (e.g. Google Forms → Apps Script) and POST to `/api/webhooks/lead-capture`.
2. **Orchestration**: The API sends events to Inngest; the Control Tower workflow (`inngest/functions/control-tower-workflow.ts`) runs the 6-stage pipeline.
3. **Verification & risk**: Workflow steps call OpenSanctions, ProcureCheck, Firecrawl (when enabled), and AI agents; state is updated in the database.
4. **External callbacks**: Contract signing and other events are received via webhooks (e.g. `/api/webhooks/contract-signed`) and drive the workflow forward without polling.

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+ (or Node.js v20+)
- [PostgreSQL 16](https://www.postgresql.org/) (or [Docker](https://www.docker.com/) & Docker Compose for local DB)
- [Clerk](https://clerk.com/) account for authentication

### Installation

1. **Clone and enter the repo**
   ```bash
   git clone <your-repo-url>
   cd sc-onboard-controltower
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Environment**
   Copy the example env and set your keys:
   ```bash
   cp .env.example .env.local
   ```
   Configure at least: Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`), PostgreSQL (`DATABASE_URL`), OpenSanctions (`OPENSANCTIONS_*`), and for webhooks/callbacks `GAS_WEBHOOK_SECRET` / `CRON_SECRET`. Add Inngest keys when running in production.

   Optional manual-testing mock environment variables:
   - `MOCK_DATABASE_URL` for the dedicated seeded mock database
   - `ENABLE_LOCAL_MOCK_ENV=true` for local mock/manual-test mode
   - `ENABLE_DEV_MOCK_ENV=true` for preview/dev-style deployments using the mock DB
   When both flags are absent or false, the app stays on `DATABASE_URL` and current behavior is unchanged.

4. **Database**
   (Optional) Start PostgreSQL via Docker:
   ```bash
   docker compose up -d db
   ```
   Set `DATABASE_URL` (e.g. `postgresql://postgres:postgres@localhost:5432/controltower`) and apply migrations:
   ```bash
   bun run db:migrate
   ```

   Optional manual-testing database:
   ```bash
   docker compose up -d mock_db
   bun run mock:db:bootstrap
   ```

   Suggested local mock DB URL:
   ```bash
   postgresql://postgres:postgres@localhost:5434/controltower_mock
   ```

   For Vercel Preview or Development environments, set `MOCK_DATABASE_URL` to an external Postgres instance and enable `ENABLE_DEV_MOCK_ENV=true` only in that environment. Production should leave the flag unset.

### Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start Next.js dev server (Turbo) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run linting |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Run migrations |
| `bun run db:migrate:mock` | Run migrations against the mock/manual-test DB |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run mock:db:reset` | Reset the dedicated mock/manual-test DB |
| `bun run mock:db:seed` | Seed the dedicated mock/manual-test DB |
| `bun run mock:db:bootstrap` | Reset, migrate, and seed the dedicated mock/manual-test DB |
| `bun run test:e2e` | Run Playwright E2E tests |
| `bun run test:e2e:banner-prod` | E2E: verify no UAT banner in production |
| `bun run test:e2e:banner-dev` | E2E: verify UAT banner in preview env |

## Manual Testing Mock Environment

Use this when a client or stakeholder needs a realistic sandbox with seeded data and deterministic non-Gemini provider responses.

Behavior:
- `DATABASE_URL` remains the normal dev DB and is never seeded by the mock tooling.
- `TEST_DATABASE_URL` remains reserved for Playwright.
- `MOCK_DATABASE_URL` is used only when `ENABLE_LOCAL_MOCK_ENV` or `ENABLE_DEV_MOCK_ENV` is explicitly enabled.
- ProcureCheck, ITC, and FICA verification responses are deterministic in mock mode.
- Gemini-backed AI calls remain real in all environments.

Typical local flow:
```bash
docker compose up -d mock_db
export MOCK_DATABASE_URL="postgresql://postgres:postgres@localhost:5434/controltower_mock"
export ENABLE_LOCAL_MOCK_ENV=true
bun run mock:db:bootstrap
bun run dev
```

Typical Vercel Preview flow:
```bash
# Set these in Vercel Preview environment variables
MOCK_DATABASE_URL=<external-postgres-url>
ENABLE_DEV_MOCK_ENV=true
```

Leave both flags unset in normal development if you want the app to keep using the unseeded primary dev database.

### GitHub MCP (Cursor)

The project includes a GitHub MCP server for AI-assisted GitHub workflows (PRs, issues, file ops, search). Configure it:

1. Copy the example config: `cp .cursor/mcp.json.example .cursor/mcp.json`
2. Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope.
3. Add your token to `.cursor/mcp.json` under `mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN`.
4. Restart Cursor for changes to take effect.

**Alternative:** Install the [GitHub CLI](https://cli.github.com/) (`gh`) for terminal-based GitHub workflows.

### Running the app

```bash
bun dev
```

Then open the app at the URL shown in the terminal (e.g. `http://localhost:3000`).
