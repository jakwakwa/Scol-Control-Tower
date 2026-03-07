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
| **Database** | [Turso](https://turso.tech/) (LibSQL) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
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
- [Turso CLI](https://docs.turso.tech/cli) for database creation and tokens
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
   Configure at least: Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`), Turso (`TURSO_*`), OpenSanctions (`OPENSANCTIONS_*`), and for webhooks/callbacks `GAS_WEBHOOK_SECRET` / `CRON_SECRET`. Add Inngest keys when running in production.

4. **Database**
   Create your Turso DB and apply migrations:
   ```bash
   bun run db:migrate
   ```

### Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start Next.js dev server (Turbo) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run linting |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Run migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run test:e2e` | Run Playwright E2E tests |

### Running the app

```bash
bun dev
```

Then open the app at the URL shown in the terminal (e.g. `http://localhost:3000`).
