# AGENTS.md

## Learned User Preferences

- Use bun as the preferred package manager and command runner; do not use bunx
- For Playwright, default to `bun run test:e2e` exactly; avoid custom env/CLI overrides unless the user explicitly asks for them
- Use Biome as the linter and formatter for TypeScript files and projects
- Run `bun run build` and `bun run lint` after implementing changes unless the user explicitly asks to skip verification to preserve an in-progress runtime workflow
- Avoid restarting active workflow/dev-server processes unless the user explicitly approves it
- Implement large refactors as verification-gated waves, not one large parallel change; prove each wave before starting the next
- Each wave should be small enough to fit inside an agent context window
- Prefer safe, slower rollout cadence over maximum throughput; pause and verify ground truth when uncertainty arises
- Do not generalize data models beyond the current known requirements; cross future bridges when they arrive
- Split Inngest `step.run` blocks so each step contains only one side effect (email, notification, DB write) to avoid duplicate side effects on retries
- For human-driven dev scenarios and straight-through flows, do not add or leave an automatic scenario runner in parallel with manual steps unless the user explicitly asked for that automation
- Do not treat Drizzle Studio relation or graph extraction as the primary proof that a schema or migration change is correct; verify with migrations, application behavior, or tests

## Learned Workspace Facts

- `bun run lint` runs Biome (not next lint)
- The repo uses Drizzle ORM with Turso (libSQL/SQLite), not Prisma; schema lives in `db/schema.ts`
- Inngest is the workflow orchestration engine; `cancelOn` only interrupts between steps, not mid-step
- The onboarding workflow has exactly 4 risk check families: PROCUREMENT, ITC, SANCTIONS, and FICA — stored in `risk_check_results`; they must run 100% independently with no bundling in shared step.run or Promise.all pairs
- External sanctions ingestion is the intended primary signal; the manual compliance route at `/api/sanctions` is the fallback/override
- The Stage 6 `AGREEMENT_CONTRACT` CEL predicate is the canonical contract signature gate (not Stage 5)
- `terminateRun()` wraps `executeKillSwitch()` and always throws `NonRetriableError` to exit Inngest runs cleanly
- Manually-created migration SQL files must be registered in `migrations/meta/_journal.json`; `drizzle-kit migrate` silently skips unregistered files
- Test DB selection is automatic only when running `bun run test:e2e*`; no manual .env switching required — Playwright injects test DB vars into its spawned app server
- For E2E Clerk auth, document both `E2E_CLERK_***_USERNAME` and `E2E_CLERK_***_EMAIL` in `.env.test.example`; they are distinct (username vs email for sign-in)
- Manual Green Lane actions from the dashboard are gated in code on the Clerk organization permission `org:green_lane:approve`
- Do not describe local dev scenarios or human straight-through flows as `mock tests`; that label does not match how this project refers to those flows
