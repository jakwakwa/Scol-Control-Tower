# AGENTS.md

## Learned User Preferences

- Use bun (and bunx when needed) as the preferred package manager for all projects
- Use Biome as the linter and formatter for TypeScript files and projects
- Run `bun run build` and `bun run lint` after implementing changes to verify the solution works
- Implement large refactors as verification-gated waves, not one large parallel change; prove each wave before starting the next
- Each wave should be small enough to fit inside an agent context window
- Prefer safe, slower rollout cadence over maximum throughput; pause and verify ground truth when uncertainty arises
- Do not generalize data models beyond the current known requirements; cross future bridges when they arrive
- Split Inngest `step.run` blocks so each step contains only one side effect (email, notification, DB write) to avoid duplicate side effects on retries

## Learned Workspace Facts

- `bun run lint` runs Biome (not next lint)
- Database reset and migration renumbering is acceptable when the app is pre-production with no users
- The repo uses Drizzle ORM with Turso (libSQL/SQLite), not Prisma; schema lives in `db/schema.ts`
- Inngest is the workflow orchestration engine; `cancelOn` only interrupts between steps, not mid-step
- The onboarding workflow has exactly 4 risk check families: PROCUREMENT, ITC, SANCTIONS, and FICA — stored in a dedicated `risk_check_results` table
- External sanctions ingestion is the intended primary signal; the manual compliance route at `/api/sanctions` is the fallback/override
- The Stage 6 `AGREEMENT_CONTRACT` CEL predicate is the canonical contract signature gate (not Stage 5)
- `terminateRun()` wraps `executeKillSwitch()` and always throws `NonRetriableError` to exit Inngest runs cleanly
- `riskAssessments` is a derived aggregate/report snapshot, not the source of truth for per-check progress
- Pre-existing test failures in `FormFacilitySubmittedSchema` are known and unrelated to current work
