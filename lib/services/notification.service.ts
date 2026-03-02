/**
 * Notification service - internal notification operations + management escalation
 * SOP-aligned: Implements escalation for kill switch, timeout, and compliance triggers
 */
import { getDatabaseClient } from "@/app/utils";
import { applicants, notifications, workflowEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendInternalAlertEmail } from "./email.service";

export interface DispatchPayload {
	applicantId: number;
	workflowId: number;
	riskScore: number;
	anomalies: string[];
	documentLinks?: string[];
}

/**
 * Dispatch to internal platform for agent review
 */
export async function dispatchToPlatform(
	payload: DispatchPayload,
): Promise<void> {
	console.log(
		`[NotificationService] Dispatching to Platform: Workflow ${payload.workflowId}`,
	);

	let clientName = "Unknown Client";

	if (payload.applicantId) {
		const db = getDatabaseClient();
		if (db) {
			try {
				const applicantResults = await db
					.select()
					.from(applicants)
					.where(eq(applicants.id, payload.applicantId));
				if (applicantResults.length > 0 && applicantResults[0]) {
					clientName = applicantResults[0].companyName;
				}
			} catch (err) {
				console.error("[NotificationService] Failed to fetch applicant:", err);
			}
		}
	}

	console.log(`[NotificationService] Platform dispatch for: ${clientName}`, {
		workflowId: payload.workflowId,
		riskScore: payload.riskScore,
		anomalies: payload.anomalies,
	});
}

export interface EscalationPayload {
	workflowId: number;
	applicantId: number;
	reason: string;
	escalationType?: "kill_switch" | "timeout" | "compliance" | "manual" | "retry_exhausted";
	severity?: "info" | "warning" | "critical";
}

/**
 * Escalate workflow to management — SOP compliance
 *
 * Creates an internal notification and sends an email alert.
 * Triggered on:
 * - Kill switch activations
 * - Timeout terminations
 * - Compliance violations (sanctions block)
 * - Mandate retry exhaustion
 */
export async function escalateToManagement(
	payload: EscalationPayload,
): Promise<void> {
	console.warn(
		`[NotificationService] ESCALATING Workflow ${payload.workflowId}: ${payload.reason}`,
	);

	const db = getDatabaseClient();
	if (!db) {
		console.error("[NotificationService] Cannot escalate — no database connection");
		return;
	}

	const severity = payload.severity || "warning";
	const escalationType = payload.escalationType || "manual";

	try {
		// Create internal notification for management
		await db.insert(notifications).values({
			workflowId: payload.workflowId,
			applicantId: payload.applicantId,
			type: severity === "critical" ? "error" : "warning",
			message: `ESCALATION [${escalationType.toUpperCase()}]: ${payload.reason}`,
			actionable: true,
			read: false,
			severity: severity === "critical" ? "critical" : "high",
		});

		// Log the escalation as a workflow event
		await db.insert(workflowEvents).values({
			workflowId: payload.workflowId,
			eventType: "management_escalation" as string,
			payload: JSON.stringify({
				reason: payload.reason,
				escalationType,
				severity,
				escalatedAt: new Date().toISOString(),
			}),
			actorType: "platform",
		});

		// Send email alert to management
		await sendInternalAlertEmail({
			title: `ESCALATION: ${escalationType.replace("_", " ").toUpperCase()}`,
			message: `Workflow ${payload.workflowId} has been escalated to management.\n\nReason: ${payload.reason}\nSeverity: ${severity}\nType: ${escalationType}`,
			workflowId: payload.workflowId,
			applicantId: payload.applicantId,
			type: severity === "critical" ? "warning" : "info",
		});
	} catch (error) {
		console.error("[NotificationService] Escalation failed:", error);
	}
}
