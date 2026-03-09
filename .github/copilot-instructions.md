# GitHub Copilot Instructions for SCOL Watchtower

Use the canonical rule files instead of duplicating guidance:
- `.cursor/rules/rules-index.mdc` (see linked `frontend.mdc` and `no-seeded-data.mdc`)
- `.agents/rules/rules-index.md` (plus `frontend.md` and `no-seeded.md`)
- `AGENTS.md` for project overview, run commands, and operational gotchas

## Quick start
- Stack: Next.js 16, TypeScript (strict), Bun-only (no npm/yarn/pnpm), Turso + Drizzle, Clerk, Inngest.
- Dev: `bun run dev` (Next.js) or `bun run dev:all` (Next.js + Inngest).
- Lint/format: `bunx @biomejs/biome check .` (do **not** use `bun run lint`; Next.js lint is removed).
- Build: `bun run build` currently hits the known `stageName` schema TypeScript error in `db/schema.ts`; note this when reporting.
- Tests: Playwright E2E (`bun run test:e2e`); reset test DB with `bun run test:db:reset`.

## Patterns and rules
- Follow the frontend and no-seeded-data rules in `.cursor/rules` / `.agents/rules`.
- Favor RSC, event-driven workflows, and Bun-first tooling; use Drizzle schemas in `db/schema.ts` and Clerk auth middleware in `proxy.ts`.
- No seeded data or fixture inserts.

## Environment
- Use `.env.example` as a baseline to create `.env.local` (for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `TURSO_*`, etc.), and ensure you also add `DATABASE_URL` and any other required secrets.
