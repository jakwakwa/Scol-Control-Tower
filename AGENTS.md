 # AGENTS.md

## Cursor Cloud specific instructions

### Product overview

SCOL Watchtower is a Next.js 16 onboarding automation platform using Bun, Turso (LibSQL), Clerk auth, and Inngest for background workflows. See `README.md` for full architecture details.

### Running services

- **Dev server**: `bun run dev` (runs `next dev --turbo` on port 3000)
- **Dev server + Inngest**: `bun run dev:all` (runs `setup-dev.sh`, starts both Next.js and Inngest dev server)
- Inngest dev UI available at `http://localhost:8288` when using `dev:all`

### Linting

- This project uses **Biome** (`@biomejs/biome`) for linting and formatting, not ESLint. `next lint` was removed in Next.js 16.
- Run: `npx @biomejs/biome check .` (lint + format) or `npx @biomejs/biome lint .` (lint only)
- Config: `biome.json`

### Build

- `bun run build` — note: there is a pre-existing TypeScript error (`stageName` column referenced but missing from `workflows` schema in `db/schema.ts`). This blocks `next build` but does **not** affect the dev server (Turbopack transpiles without type-checking).

### Testing

- E2E tests use Playwright: `bun run test:e2e`
- Playwright config: `playwright.config.ts`
- Test DB reset: `bun run test:db:reset`

### Database

- Uses Turso (cloud-hosted LibSQL) — no local database server needed
- Drizzle ORM with schema at `db/schema.ts`
- Migrations: `bun run db:migrate`
- DB studio: `bun run db:studio`

### Environment variables

- Secrets are injected as environment variables in Cloud Agent VMs
- `.env.local` must be created from environment variables for Next.js to read them (Next.js loads `.env.local` at startup via `@next/env`)
- Required: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`, `TURSO_*` vars
- See `.env.example` for the full list

### Gotchas

- Bun must be installed separately (not pre-installed in VM); the update script handles this
- The `bun run lint` script calls `next lint` which is removed in Next.js 16 — use Biome directly instead
- Hot reload works in dev mode; no restart needed after code changes (but dependency changes require `bun install`)
