/**
 * Terminate Run Service — Active workflow termination for timeout paths
 *
 * Wraps `executeKillSwitch()` for use inside Inngest workflow steps.
 * After executing the full kill switch (DB update, form revocation,
 * Inngest cancel event, audit trail, email alerts), throws a
 * NonRetriableError so the workflow exits cleanly without retries.
 */

import { NonRetriableError } from "inngest";
import { executeKillSwitch, type KillSwitchReason } from "./kill-switch.service";

export interface TerminateRunInput {
	workflowId: number;
	applicantId: number;
	stage: number;
	reason: KillSwitchReason;
	notes?: string;
}

/**
 * Terminate a workflow run through the Guard Kill Switch.
 *
 * 1. Executes kill switch (sets DB status, revokes forms, sends cancel event, audit log)
 * 2. Throws NonRetriableError so Inngest does not retry the function
 *
 * @throws {NonRetriableError} Always — this function never returns normally
 */
export async function terminateRun(input: TerminateRunInput): Promise<never> {
	const result = await executeKillSwitch({
		workflowId: input.workflowId,
		applicantId: input.applicantId,
		reason: input.reason,
		decidedBy: "system",
		notes: input.notes ?? `Automatic timeout termination at stage ${input.stage}`,
	});

	if (!result.success) {
		console.error(
			`[terminateRun] Kill switch failed for workflow ${input.workflowId}:`,
			result.error
		);
	}

	throw new NonRetriableError(
		`[TerminateRun] Workflow ${input.workflowId} terminated: ${input.reason}`
	);
}
