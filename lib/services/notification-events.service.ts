import { and, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import type { NotificationSeverity } from "@/db/schema";
import { notifications, workflowEvents } from "@/db/schema";

export interface CreateNotificationParams {
	workflowId: number;
	applicantId: number;
	type:
		| "awaiting"
		| "completed"
		| "failed"
		| "timeout"
		| "paused"
		| "error"
		| "warning"
		| "success"
		| "info"
		| "terminated";
	title: string;
	message: string;
	actionable?: boolean;
	errorDetails?: object;
	severity?: NotificationSeverity;
	groupKey?: string;
}

export interface LogEventParams {
	workflowId: number;
	eventType:
		| "stage_change"
		| "agent_dispatch"
		| "agent_callback"
		| "human_override"
		| "timeout"
		| "error"
		| "risk_check_completed"
		| "itc_check_completed"
		| "quote_generated"
		| "quote_sent"
		| "quote_adjusted"
		| "quote_needs_update"
		| "mandate_determined"
		| "mandate_verified"
		| "mandate_retry"
		| "mandate_collection_expired"
		| "procurement_check_completed"
		| "procurement_decision"
		| "ai_analysis_completed"
		| "reporter_analysis_completed"
		| "agreementContract_integration_completed"
		| "workflow_completed"
		| "kill_switch_executed"
		| "kill_switch_handled"
		| "business_type_determined"
		| "documents_requested"
		| "validation_completed"
		| "sanctions_completed"
		| "sanction_cleared"
		| "risk_analysis_completed"
		| "risk_manager_review"
		| "financial_statements_confirmed"
		| "contract_draft_reviewed"
		| "contract_signed"
		| "absa_form_completed"
		| "two_factor_approval_risk_manager"
		| "two_factor_approval_account_manager"
		| "final_approval"
		| "management_escalation"
		| "stale_data_flagged"
		| "state_lock_acquired"
		| "green_lane_approval"
		| "green_lane_auto_approved";
	payload: object;
	actorType?: "user" | "agent" | "platform";
	actorId?: string;
}

/**
 * Create a notification in the Control Tower UI.
 *
 * Tiered behaviour:
 * - low severity: no notification created (log-only via caller)
 * - medium severity with groupKey: upserts into an existing group summary
 * - high/critical severity: always creates a new notification
 */
export async function createWorkflowNotification(
	params: CreateNotificationParams
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) {
		console.error("[NotificationEvents] Failed to get database client");
		return;
	}

	const severity = params.severity ?? "medium";

	// Low severity: no dashboard notification — caller should log only
	if (severity === "low") {
		console.info(
			`[NotificationEvents] Low severity — skipping notification: ${params.title}`
		);
		return;
	}

	try {
		// Medium severity with groupKey: batch into a single summary notification
		if (severity === "medium" && params.groupKey) {
			const existing = await db
				.select()
				.from(notifications)
				.where(
					and(eq(notifications.groupKey, params.groupKey), eq(notifications.read, false))
				)
				.limit(1);

			if (existing.length > 0) {
				const current = existing[0];
				const updatedMessage = `${current.message}\n• ${params.message}`;
				await db
					.update(notifications)
					.set({
						message: updatedMessage,
						createdAt: new Date(),
					})
					.where(eq(notifications.id, current.id));
				return;
			}
		}

		await db.insert(notifications).values([
			{
				workflowId: params.workflowId,
				applicantId: params.applicantId,
				type: params.type,
				message: `${params.title}: ${params.message}`,
				actionable: params.actionable ?? true,
				read: false,
				severity,
				groupKey: params.groupKey,
			},
		]);
	} catch (error) {
		console.error("[NotificationEvents] Failed to create notification:", error);
	}
}

/**
 * Log a workflow event to the activity feed
 */
export async function logWorkflowEvent(params: LogEventParams): Promise<void> {
	const db = getDatabaseClient();
	if (!db) {
		console.error("[NotificationEvents] Failed to get database client");
		return;
	}

	try {
		await db.insert(workflowEvents).values([
			{
				workflowId: params.workflowId,
				eventType: params.eventType,
				payload: JSON.stringify(params.payload),
				actorType: params.actorType || "platform",
				actorId: params.actorId,
				timestamp: new Date(),
			},
		]);
	} catch (error) {
		console.error("[NotificationEvents] Failed to log workflow event:", error);
	}
}
