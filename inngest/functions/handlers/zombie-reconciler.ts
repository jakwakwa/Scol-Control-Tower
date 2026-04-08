/**
 * Zombie Reconciler — Scheduled Inngest function
 *
 * Scans for Stage 2 workflows that have been stuck past their configured
 * timeout window and terminates them via the kill-switch path.
 *
 * This is a safety net for runs that have already detached from their
 * waitForEvent timeout (e.g., the Inngest run died, was cancelled, or
 * the timeout was missed due to infrastructure issues).
 *
 * Runs daily; idempotent — already-terminated workflows are skipped.
 */

import { and, eq, lt, notInArray } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import { logWorkflowEvent } from "@/lib/services/notification-events.service";
import { inngest } from "../../client";

const STAGE2_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const TERMINAL_STATUSES = ["completed", "terminated", "failed"];

export const zombieReconciler = inngest.createFunction(
	{
		id: "zombie-reconciler",
		name: "Stage 2 Zombie Reconciler",
	},
	{ cron: "0 3 * * *" },
	async ({ step }) => {
		const zombies = await step.run("find-stage2-zombies", async () => {
			const db = getDatabaseClient();
			if (!db) return [];

			const cutoff = new Date(Date.now() - STAGE2_MAX_AGE_MS);

			const stuck = await db
				.select({
					id: workflows.id,
					applicantId: workflows.applicantId,
					stage: workflows.stage,
					status: workflows.status,
					startedAt: workflows.startedAt,
				})
				.from(workflows)
				.where(
					and(
						eq(workflows.stage, 2),
						notInArray(workflows.status, TERMINAL_STATUSES),
						lt(workflows.startedAt, cutoff)
					)
				);

			return stuck.map(w => ({
				workflowId: w.id,
				applicantId: w.applicantId,
				status: w.status,
				startedAt: w.startedAt ? new Date(w.startedAt).toISOString() : null,
			}));
		});

		if (zombies.length === 0) {
			return { reconciled: 0 };
		}

		let reconciled = 0;

		for (const zombie of zombies) {
			await step.run(`reconcile-${zombie.workflowId}`, async () => {
				const db = getDatabaseClient();
				if (!db) return;

				const [current] = await db
					.select({ status: workflows.status })
					.from(workflows)
					.where(eq(workflows.id, zombie.workflowId));

				if (!current || TERMINAL_STATUSES.includes(current.status ?? "")) {
					return;
				}

				await logWorkflowEvent({
					workflowId: zombie.workflowId,
					eventType: "error",
					payload: {
						context: "zombie_reconciliation",
						originalStatus: zombie.status,
						startedAt: zombie.startedAt,
						reconciledAt: new Date().toISOString(),
					},
				});

				await executeKillSwitch({
					workflowId: zombie.workflowId,
					applicantId: zombie.applicantId,
					reason: "STAGE2_FACILITY_TIMEOUT",
					decidedBy: "system:zombie-reconciler",
					notes: `Zombie reconciliation: Stage 2 workflow stuck since ${zombie.startedAt}`,
				});

				reconciled++;
			});
		}

		return { found: zombies.length, reconciled };
	}
);
