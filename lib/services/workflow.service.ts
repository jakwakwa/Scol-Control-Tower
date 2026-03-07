/**
 * Workflow service - database operations for workflow state
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { type WorkflowStatus, workflows } from "@/db/schema";

/**
 * Update workflow status and stage in the database
 */
export async function updateWorkflowStatus(
	workflowId: number,
	status: WorkflowStatus,
	stage: number
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) {
		throw new Error("Failed to get database client");
	}

	await db
		.update(workflows)
		.set({
			status: status as any,
			stage,
		})
		.where(eq(workflows.id, workflowId));
}
