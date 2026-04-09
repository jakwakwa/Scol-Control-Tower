import { and, eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import type { NotificationSeverity } from "@/db/schema";
import { notifications, workflowEvents } from "@/db/schema";
import { broadcast } from "@/lib/notification-broadcaster";
import { parseCreateWorkflowNotificationInput } from "@/lib/notifications/contract";
import type { NotificationType } from "@/lib/notifications/types";

export interface NotificationErrorDetails {
	message: string;
	code?: string;
	raw?: unknown;
}

export interface CreateNotificationParams {
	workflowId: number;
	applicantId: number;
	type: NotificationType;
	title: string;
	message: string;
	actionable?: boolean;
	errorDetails?: NotificationErrorDetails;
	severity?: NotificationSeverity;
	groupKey?: string;
	/** When set, dashboards route/classify by this workflow event instead of user-facing copy */
	sourceEventType?: string | null;
}

export interface LogEventParams {
	workflowId: number;
	eventType:
		| "stage_change"
		| "agent_dispatch"
		| "agent_callback"
		| "human_adjudication"
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
		| "sanctions_confirmed"
		| "sanction_cleared"
		| "risk_analysis_completed"
		| "risk_manager_review"
		| "financial_statements_confirmed"
		| "contract_draft_reviewed"
		| "contract_signed"
		| "absa_form_completed"
		| "absa_approval_confirmed"
		| "absa_packet_sent"
		| "two_factor_approval_risk_manager"
		| "two_factor_approval_account_manager"
		| "final_approval"
		| "management_escalation"
		| "stale_data_flagged"
		| "state_lock_acquired"
		| "re_applicant_denied"
		| "sanctions_ingress_received"
		| "fica_check_completed"
		| "green_lane_approved"
		| "green_lane_blocked"
		| "green_lane_requested"
		| "vat_verification_completed"
		| "vendor_check_failed"
		| "vendor_check_succeeded"
		| "reminder_sent";
	payload: object;
	actorType?: "user" | "agent" | "platform";
	actorId?: string;
}

export async function createWorkflowNotification(
	params: CreateNotificationParams
): Promise<void> {
	const db = getDatabaseClient();
	if (!db) {
		console.error("[NotificationEvents] Failed to get database client");
		return;
	}

	const validated = parseCreateWorkflowNotificationInput(params);
	if (!validated) {
		return;
	}

	const severity = validated.severity ?? "medium";

	if (severity === "low") {
		console.info(
			`[NotificationEvents] Low severity — skipping notification: ${validated.title}`
		);
		return;
	}

	const messageBody = `${validated.title}: ${validated.message}`;
	const sourceEventType = validated.sourceEventType ?? null;

	try {
		if (severity === "medium" && validated.groupKey) {
			const existing = await db
				.select()
				.from(notifications)
				.where(
					and(
						eq(notifications.groupKey, validated.groupKey),
						eq(notifications.read, false)
					)
				)
				.limit(1);

			if (existing.length > 0) {
				const current = existing[0];
				const updatedMessage = `${current.message}\n• ${messageBody}`;
				await db
					.update(notifications)
					.set({
						message: updatedMessage,
						createdAt: new Date(),
						sourceEventType: current.sourceEventType ?? sourceEventType,
					})
					.where(eq(notifications.id, current.id));
				broadcast({ type: "update", notificationId: current.id });
				return;
			}
		}

		const result = await db
			.insert(notifications)
			.values([
				{
					workflowId: validated.workflowId,
					applicantId: validated.applicantId,
					type: validated.type,
					message: messageBody,
					actionable: validated.actionable ?? true,
					read: false,
					severity,
					groupKey: validated.groupKey,
					sourceEventType,
				},
			])
			.returning({ id: notifications.id });

		const insertedId = result[0]?.id;
		if (insertedId) {
			broadcast({ type: "notification", notificationId: insertedId });
		}
	} catch (error) {
		console.error("[NotificationEvents] Failed to create notification:", error);
	}
}

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
