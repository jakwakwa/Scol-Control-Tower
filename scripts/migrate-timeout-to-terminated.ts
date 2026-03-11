/**
 * One-time migration: Rewrite `status = "timeout"` rows to `terminated`
 * and backfill `terminationReason`.
 *
 * Uses the most specific reason available from workflow events;
 * falls back to `TIMEOUT_TERMINATION` only when no stronger evidence exists.
 *
 * Usage: bun run scripts/migrate-timeout-to-terminated.ts
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { workflowEvents, workflows } from "@/db/schema";

const TIMEOUT_REASON_PATTERNS: Record<string, string> = {
	STAGE2_FACILITY_TIMEOUT: "STAGE2_FACILITY_TIMEOUT",
	STAGE2_PRE_RISK_APPROVAL_TIMEOUT: "STAGE2_PRE_RISK_APPROVAL_TIMEOUT",
	STAGE2_PRE_RISK_EVAL_TIMEOUT: "STAGE2_PRE_RISK_EVAL_TIMEOUT",
	STAGE2_QUOTE_APPROVAL_TIMEOUT: "STAGE2_QUOTE_APPROVAL_TIMEOUT",
	STAGE2_QUOTE_RESPONSE_TIMEOUT: "STAGE2_QUOTE_RESPONSE_TIMEOUT",
	STAGE3_FICA_UPLOAD_TIMEOUT: "STAGE3_FICA_UPLOAD_TIMEOUT",
	STAGE4_FINANCIAL_STATEMENTS_TIMEOUT: "STAGE4_FINANCIAL_STATEMENTS_TIMEOUT",
	STAGE5_CONTRACT_REVIEW_TIMEOUT: "STAGE5_CONTRACT_REVIEW_TIMEOUT",
	STAGE5_ABSA_FORM_TIMEOUT: "STAGE5_ABSA_FORM_TIMEOUT",
	STAGE6_RISK_MANAGER_TIMEOUT: "STAGE6_RISK_MANAGER_TIMEOUT",
	STAGE6_ACCOUNT_MANAGER_TIMEOUT: "STAGE6_ACCOUNT_MANAGER_TIMEOUT",
	STAGE6_RISK_AND_ACCOUNT_MANAGER_TIMEOUT: "STAGE6_RISK_AND_ACCOUNT_MANAGER_TIMEOUT",
	STAGE6_CONTRACT_SIGNATURE_TIMEOUT: "STAGE6_CONTRACT_SIGNATURE_TIMEOUT",
};

async function main() {
	const db = getDatabaseClient();
	if (!db) {
		console.error("Failed to get database client");
		process.exit(1);
	}

	const timeoutWorkflows = await db
		.select({
			id: workflows.id,
			stage: workflows.stage,
			terminationReason: workflows.terminationReason,
		})
		.from(workflows)
		.where(eq(workflows.status, "timeout"));

	if (timeoutWorkflows.length === 0) {
		return;
	}

	let _migrated = 0;

	for (const wf of timeoutWorkflows) {
		let reason = wf.terminationReason;

		if (!reason) {
			const events = await db
				.select({ payload: workflowEvents.payload })
				.from(workflowEvents)
				.where(eq(workflowEvents.workflowId, wf.id));

			for (const evt of events) {
				if (!evt.payload) continue;
				try {
					const parsed = JSON.parse(evt.payload);
					const r = parsed.reason as string | undefined;
					if (r && r in TIMEOUT_REASON_PATTERNS) {
						reason = TIMEOUT_REASON_PATTERNS[r];
						break;
					}
				} catch {
					// skip malformed payloads
				}
			}
		}

		if (!reason) {
			reason = "TIMEOUT_TERMINATION";
		}

		await db
			.update(workflows)
			.set({
				status: "terminated",
				terminationReason: reason,
				terminatedAt: new Date(),
				terminatedBy: "system:migration",
			})
			.where(eq(workflows.id, wf.id));
		_migrated++;
	}
}

main().catch(err => {
	console.error("Migration failed:", err);
	process.exit(1);
});
