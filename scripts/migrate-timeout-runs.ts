/**
 * One-time migration: Convert existing `status = 'timeout'` workflows
 * to `status = 'terminated'` with `terminationReason = 'TIMEOUT_TERMINATION'`.
 *
 * Usage:
 *   bun run scripts/migrate-timeout-runs.ts
 *
 * Dry run (no changes):
 *   DRYRUN=1 bun run scripts/migrate-timeout-runs.ts
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";

async function migrate() {
	const dryRun = process.env.DRYRUN === "1";
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Failed to get database client");
	}

	const stale = await db
		.select({ id: workflows.id, applicantId: workflows.applicantId })
		.from(workflows)
		.where(eq(workflows.status, "timeout"));

	if (stale.length === 0) {
		return;
	}

	if (dryRun) {
		return;
	}

	const now = new Date();
	let _migrated = 0;

	for (const wf of stale) {
		await db
			.update(workflows)
			.set({
				status: "terminated",
				terminatedAt: now,
				terminatedBy: "system:migration",
				terminationReason: "TIMEOUT_TERMINATION",
			})
			.where(eq(workflows.id, wf.id));

		_migrated++;
	}
}

migrate().catch(err => {
	console.error("Migration failed:", err);
	process.exit(1);
});
