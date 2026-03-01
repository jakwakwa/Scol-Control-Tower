/**
 * Kill Switch Service - Control Tower Workflow Termination
 *
 * This service implements the critical kill switch functionality that allows
 * Risk Managers to immediately halt all parallel processes when procurement
 * is denied. This is a PRD-critical requirement for compliance and efficiency.
 *
 * Key Features:
 * - Immediate workflow termination (<60 second propagation)
 * - Cancellation of all pending form requests
 * - Notification to all stakeholders
 * - Audit trail for compliance
 */

import { and, eq, inArray } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import {
	applicantMagiclinkForms,
	applicants,
	notifications,
	workflowEvents,
	workflows,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import { sendInternalAlertEmail } from "./email.service";
import { escalateToManagement } from "./notification.service";

// ============================================
// Types
// ============================================

export type KillSwitchReason =
	| "PROCUREMENT_DENIED"
	| "COMPLIANCE_VIOLATION"
	| "FRAUD_DETECTED"
	| "TIMEOUT_TERMINATION"
	| "MANUAL_TERMINATION";

export interface KillSwitchResult {
	success: boolean;
	workflowId: number;
	terminatedAt: Date;
	reason: KillSwitchReason;
	affectedResources: {
		formsRevoked: number;
		notificationsSent: number;
	};
	error?: string;
}

export interface KillSwitchInput {
	workflowId: number;
	applicantId: number;
	reason: KillSwitchReason;
	decidedBy: string;
	notes?: string;
}

// ============================================
// Kill Switch Implementation
// ============================================

/**
 * Execute the kill switch - immediately terminates all workflow processes
 * This is the primary function called when Risk Manager denies procurement
 *
 * @param input Kill switch parameters
 * @returns Result of the kill switch operation
 */
export async function executeKillSwitch(
	input: KillSwitchInput
): Promise<KillSwitchResult> {
	const { workflowId, applicantId, reason, decidedBy, notes } = input;
	const terminatedAt = new Date();

	const db = getDatabaseClient();
	if (!db) {
		return {
			success: false,
			workflowId,
			terminatedAt,
			reason,
			affectedResources: { formsRevoked: 0, notificationsSent: 0 },
			error: "Database connection failed",
		};
	}

	try {
		// Step 1: Update workflow status to terminated
		await db
			.update(workflows)
			.set({
				status: "terminated",
				terminatedAt: terminatedAt,
				terminatedBy: decidedBy,
				terminationReason: reason,
				metadata: notes ? JSON.stringify({ notes }) : undefined,
			})
			.where(eq(workflows.id, workflowId));

		// Step 2: Revoke all pending form links
		const formsRevoked = await revokeAllPendingForms(db, applicantId, workflowId);

		// Step 3: Log the kill switch event
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "kill_switch_executed",
			payload: JSON.stringify({
				reason,
				decidedBy,
				notes,
				formsRevoked,
				terminatedAt: terminatedAt.toISOString(),
			}),
			actorType: "user",
			actorId: decidedBy,
		});

		// Step 4: Create termination notification
		await db.insert(notifications).values({
			workflowId,
			applicantId,
			type: "terminated",
			message: `Workflow terminated: ${getReasonMessage(reason)}`,
			actionable: false,
		});

		// Step 5: Send Inngest cancellation event
		// This will signal any waiting steps to terminate
		await inngest.send({
			name: "workflow/terminated",
			data: {
				workflowId,
				applicantId,
				reason,
				decidedBy,
				terminatedAt: terminatedAt.toISOString(),
			},
		});

		// Step 6: Send internal alert email
		const applicantResult = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));
		const applicant = applicantResult[0];

		await sendInternalAlertEmail({
			title: `🚨 Workflow Terminated - Kill Switch Activated`,
			message: `Workflow for ${applicant?.companyName || "Unknown"} has been terminated.\n\nReason: ${getReasonMessage(reason)}\nDecided by: ${decidedBy}\n${notes ? `Notes: ${notes}` : ""}`,
			workflowId,
			applicantId,
			type: "error",
			actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/workflows/${workflowId}`,
		});

		// Step 7: Escalate to management (SOP requirement)
		await escalateToManagement({
			workflowId,
			applicantId,
			reason: `Kill switch activated: ${getReasonMessage(reason)}${notes ? ` — ${notes}` : ""}`,
			escalationType: reason === "COMPLIANCE_VIOLATION" ? "compliance" : "kill_switch",
			severity:
				reason === "COMPLIANCE_VIOLATION" || reason === "FRAUD_DETECTED"
					? "critical"
					: "warning",
		});

		return {
			success: true,
			workflowId,
			terminatedAt,
			reason,
			affectedResources: {
				formsRevoked,
				notificationsSent: 1,
			},
		};
	} catch (error) {
		console.error("[KillSwitch] ERROR:", error);
		return {
			success: false,
			workflowId,
			terminatedAt,
			reason,
			affectedResources: { formsRevoked: 0, notificationsSent: 0 },
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Check if a workflow has been terminated (kill switch activated)
 * This should be called before any step execution in the workflow
 */
export async function isWorkflowTerminated(workflowId: number): Promise<boolean> {
	const db = getDatabaseClient();
	if (!db) return false;

	try {
		const result = await db
			.select({ status: workflows.status })
			.from(workflows)
			.where(eq(workflows.id, workflowId));

		return result[0]?.status === "terminated";
	} catch (error) {
		console.error("[KillSwitch] Error checking workflow status:", error);
		return false;
	}
}

/**
 * Revoke all pending form links for an applicant
 */
async function revokeAllPendingForms(
	db: NonNullable<ReturnType<typeof getDatabaseClient>>,
	applicantId: number,
	_workflowId: number
): Promise<number> {
	try {
		const pendingForms = await db
			.select()
			.from(applicantMagiclinkForms)
			.where(
				and(
					eq(applicantMagiclinkForms.applicantId, applicantId),
					inArray(applicantMagiclinkForms.status, ["pending", "sent", "viewed"])
				)
			);

		if (pendingForms.length === 0) return 0;

		const formIds = pendingForms.map(f => f.id);

		await db
			.update(applicantMagiclinkForms)
			.set({ status: "revoked" })
			.where(inArray(applicantMagiclinkForms.id, formIds));

		return formIds.length;
	} catch (error) {
		console.error("[KillSwitch] Error revoking forms:", error);
		return 0;
	}
}

/**
 * Get human-readable message for kill switch reason
 */
function getReasonMessage(reason: KillSwitchReason): string {
	const messages: Record<KillSwitchReason, string> = {
		PROCUREMENT_DENIED: "Procurement check denied by Risk Manager",
		COMPLIANCE_VIOLATION: "Compliance violation detected",
		FRAUD_DETECTED: "Potential fraud detected",
		TIMEOUT_TERMINATION: "Terminated automatically due to timeout",
		MANUAL_TERMINATION: "Manually terminated by administrator",
	};
	return messages[reason];
}

// ============================================
// Workflow Termination Event (for Inngest)
// ============================================

export const WORKFLOW_TERMINATED_EVENT = "workflow/terminated" as const;

export interface WorkflowTerminatedEventData {
	workflowId: number;
	applicantId: number;
	reason: KillSwitchReason;
	decidedBy: string;
	terminatedAt: string;
}
