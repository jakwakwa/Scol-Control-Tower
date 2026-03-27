---
module: Drizzle ORM & SQLite (Turso)
date: 2026-03-27
problem_type: database_issue
component: drizzle_schema
symptoms:
  - "Schema still defined unused Zapier-era tables `agents` and `xt_callbacks` with Drizzle relations and reset-script deletes"
  - "POST /api/workflows/[id]/signal and `inngest/events.ts` still referenced `onboarding/agent-callback` with no in-repo consumer"
  - "Migration history and meta snapshots had accumulated; a clean baseline was needed after removing tables from `db/schema.ts`"
root_cause: legacy_artifacts
resolution_type: schema_cleanup
severity: low
tags:
  [
    drizzle,
    migrations,
    turso,
    sqlite,
    schema-cleanup,
    dead-code,
    inngest,
    api-routes,
    migration-squash,
  ]
---

# Remove legacy `agents` / `xt_callbacks` and squash Drizzle baseline

## Symptom

The repository still defined unused Zapier-era SQLite tables (`agents`, `xt_callbacks`) with Drizzle relations and `scripts/reset-db.ts` teardown, while `POST /api/workflows/[id]/signal` and `inngest/events.ts` retained an `agent-callback` path that no longer matched real orchestration. After deleting those definitions from `db/schema.ts`, the migration folder needed a **fresh baseline** so dev and test Turso databases could be reset onto a single `0000_*.sql` chain without legacy `CREATE TABLE` statements for removed tables.

## Root cause

- **Historical integration**: External callback-style flows were superseded by Inngest and first-party APIs; the tables and event wiring were never fully removed.
- **Schema vs. migration history**: Old numbered SQL files and `migrations/meta/*` snapshots still described dropped tables until the chain was squashed and regenerated from the updated schema.
- **Leftover API surface**: The signal route and event map kept a second parse branch and event name after the database backing was obsolete.

## Working solution

1. **`db/schema.ts`** — Remove the `agents` and `xt_callbacks` (`agentCallbacks`) table blocks; remove `callbacks: many(agentCallbacks)` from `workflowsRelations` and delete `agentCallbacksRelations`.
2. **`scripts/reset-db.ts`** — Remove `db.delete(schema.agentCallbacks)` and `db.delete(schema.agents)`.
3. **`app/api/workflows/[id]/signal/route.ts`** — Keep only the UI signal path (`qualityGatePassed` / `humanOverride`) with a single Zod schema (e.g. `payload: z.unknown()`); remove inline agent-callback schema and `inngest.send` for `onboarding/agent-callback`.
4. **`inngest/events.ts`** — Remove the `"onboarding/agent-callback"` entry from the `Events` map.
5. **`lib/validations.ts`** — Remove unused agent-callback schemas, duplicate `createWorkflowSchema` / `CreateWorkflowInput`, and `dispatchPayloadSchema` / `DispatchPayload` where superseded elsewhere (e.g. notification service types); confirm with grep and `bun run build` so no callers remain.
6. **Squash migrations (local/test baseline)**  
   - Delete existing `migrations/*.sql` and `migrations/meta/*` (including snapshots).  
   - Seed `migrations/meta/_journal.json` with an **empty `entries` array** (version/dialect unchanged) so `drizzle-kit generate` does not fail on a missing journal.  
   - Run **`bun run db:generate`** to produce a single new `0000_*.sql` from the current schema.  
   - Run **`bun run db:reset`** (drops dev, migrates; drops test and `db:migrate:test` when `.env.test` defines `TEST_DATABASE_URL`).  
   - Run **`bun run build`** to verify TypeScript and Next.js compile.

**External contract:** Clients that POSTed the old agent-callback body to `/api/workflows/[id]/signal` will receive **400** after this change; there was no in-repo consumer.

## Prevention

- Remove dead tables in the schema first, then generate migrations through the normal Drizzle path; do not hand-edit committed migration SQL to “fix” drift.
- Grep for table names, raw SQL, Inngest event names, and route handlers before merging schema drops.
- Treat squashing as a **new baseline** for **clean** databases (dev/test or empty environments), not as an edit to history that production has already applied—see below.
- After a squash, use **`bun run db:reset`** (or **`bun run test:db:reset`** for test-only) so dev and test stay on the same `migrations/*.sql` chain; reserve **`db:push:test`** for deliberate ad-hoc sync without migration files.

## Verification checklist

- **Grep:** No `xt_callbacks`, `agentCallbacks`, `sqliteTable("agents"`, or `onboarding/agent-callback` in app code or `db/schema.ts` (except intentional docs).
- **`bun run build`** — passes after changes.
- **`bun run db:reset`** — migrations apply successfully for dev (and test when configured).

## When not to squash

If production (or any long-lived DB) has already applied the **old** migration chain, replacing it with a new squashed `0000_*.sql` does not change what already ran there. Coordinate a deliberate cutover (new database, restore strategy, or continue appending on the existing chain) instead of assuming `git pull` + migrate fixes existing remote state.

## Cross-references

- **Issue write-up (broader context):** [`docs/issues/database-issues/2026-03-27-drizzle-migration-squash-and-combined-db-reset.mdx`](../../issues/database-issues/2026-03-27-drizzle-migration-squash-and-combined-db-reset.mdx) — duplicate migration SQL, combined dev+test reset, removal of **`todos`** and other legacy tables, and operational notes; this solution doc focuses specifically on **`agents` / `xt_callbacks`** plus dead signal/Inngest/validation paths.
- **Workspace facts:** [`AGENTS.md`](../../../AGENTS.md) — `db:reset` vs `test:db:reset` vs `db:push:test`, and the one-line note that **`agents`** / **`xt_callbacks`** are no longer in the baseline.

## Related solutions (different topics)

- [`docs/solutions/integration-issues/stage6-workflow-stuck-inngest-orchestration-20260323.md`](../integration-issues/stage6-workflow-stuck-inngest-orchestration-20260323.md) — Inngest Stage 6 orchestration (not this schema/migration cleanup).
- [`docs/solutions/refactoring/forms-hub-consolidation-workflow-gates-20260322.md`](../refactoring/forms-hub-consolidation-workflow-gates-20260322.md) — Forms Hub / workflow gates refactor.
