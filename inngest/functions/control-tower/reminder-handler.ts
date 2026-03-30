import { eq } from "drizzle-orm";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { REMINDER_INTERVALS } from "@/lib/constants/workflow-timeouts";
import type { KillSwitchReason } from "@/lib/services/kill-switch.service";
import {
	sendApplicantReminderEmail,
	sendInternalAlertEmail,
} from "@/lib/services/email.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { guardKillSwitch } from "./helpers";
import { handleWaitTimeout } from "./timeout-handler";
import type { ControlTowerStepTools } from "./types";

// ============================================
// Types
// ============================================

export interface ReminderWaitInput {
	step: ControlTowerStepTools;
	workflowId: number;
	applicantId: number;
	stage: number;
	/** Base step ID for Inngest step naming (e.g. "wait-facility-app") */
	waitStepId: string;
	/** Inngest event name to wait for */
	eventName: string;
	/** Total hard timeout for the entire wait (original WORKFLOW_TIMEOUTS value) */
	totalTimeout: string;
	/** Match field for waitForEvent (default "data.workflowId") */
	matchField?: string;
	/** Kill switch reason if hard terminate fires */
	terminationReason: KillSwitchReason;
	/** Context for notifications */
	reminderContext: {
		/** Human-readable item name, e.g. "facility application" */
		itemName: string;
		/** Deep-link URL for the applicant (magic link) */
		applicantActionUrl?: string;
		/** AM dashboard tab for action URL */
		actionTab?: string;
	};
	/** If true, skip applicant reminder email (internal-only wait, AM-only nudge) */
	internalOnly?: boolean;
}

// ============================================
// Main Helper
// ============================================

/**
 * Waits for an Inngest event with intermediate reminder nudges.
 *
 * Splits the total wait into segments:
 *   1. First wait = REMINDER_INTERVALS.FIRST_NUDGE
 *   2. If no event: send reminder → second wait = REMINDER_INTERVALS.SECOND_NUDGE
 *   3. If still no event: last-chance reminder → final wait = remaining time to totalTimeout
 *   4. If still no event: delegate to handleWaitTimeout for hard termination
 *
 * For internal-only wait points (quote approval, contract review), only
 * the AM receives reminder notifications — no applicant email is sent.
 *
 * @returns The event payload when received.
 * @throws Via handleWaitTimeout if all reminders are exhausted and timeout triggers.
 */
export async function handleWaitWithReminders<T>(
	input: ReminderWaitInput
): Promise<T> {
	const {
		step,
		workflowId,
		applicantId,
		stage,
		waitStepId,
		eventName,
		totalTimeout,
		matchField = "data.workflowId",
		terminationReason,
		reminderContext,
		internalOnly = false,
	} = input;

	const maxReminders = REMINDER_INTERVALS.MAX_REMINDERS;

	// Build the wait durations. Each reminder gets a slot:
	//   slot 0      → FIRST_NUDGE  (reminder 1)
	//   slots 1..N  → SECOND_NUDGE (reminders 2, 3, … MAX_REMINDERS)
	//   final slot  → totalTimeout (hard terminate if missed)
	const reminderSlots = [
		REMINDER_INTERVALS.FIRST_NUDGE,
		...Array.from({ length: Math.max(0, maxReminders - 1) }, () => REMINDER_INTERVALS.SECOND_NUDGE),
	];
	const waitDurations = [...reminderSlots, totalTimeout];

	for (let i = 0; i < waitDurations.length; i++) {
		const isLastWait = i === waitDurations.length - 1;
		const stepSuffix = i === 0 ? "" : `-reminder-${i}`;
		const currentTimeout = waitDurations[i];

		const event = await step.waitForEvent(`${waitStepId}${stepSuffix}`, {
			event: eventName,
			timeout: currentTimeout,
			match: matchField,
		} as any);

		if (event) {
			return event as T;
		}

		// Last wait timed out → hard terminate
		if (isLastWait) {
			await handleWaitTimeout({
				step,
				workflowId,
				applicantId,
				stage,
				reason: terminationReason,
				notifyStepId: `notify-am-${waitStepId}-timeout`,
				terminateStepId: `terminate-${waitStepId}-timeout`,
				title: reminderContext.itemName,
				message: `${reminderContext.itemName} was not completed after ${maxReminders} reminders. Workflow terminated.`,
				timeoutWindow: totalTimeout,
				actionTab: reminderContext.actionTab,
			});
		}

		// Intermediate wait timed out → send reminder
		const reminderNumber = i + 1;

		await step.run(
			`send-reminder-${waitStepId}-${reminderNumber}`,
			async () => {
				await guardKillSwitch(
					workflowId,
					`send-reminder-${waitStepId}-${reminderNumber}`
				);

				// Log the reminder as a workflow event
				await logWorkflowEvent({
					workflowId,
					eventType: "reminder_sent",
					payload: {
						stage,
						itemName: reminderContext.itemName,
						reminderNumber,
						maxReminders,
						internalOnly,
					},
				});

				// Applicant reminder email (only for applicant-facing wait points)
				if (!internalOnly) {
					const db = getDatabaseClient();
					if (db) {
						const [applicant] = await db
							.select()
							.from(applicants)
							.where(eq(applicants.id, applicantId));

						if (applicant) {
							await sendApplicantReminderEmail({
								email: applicant.email,
								contactName: applicant.contactName,
								itemName: reminderContext.itemName,
								actionUrl: reminderContext.applicantActionUrl,
								reminderNumber,
								maxReminders,
							});
						}
					}
				}

				// AM notification (always)
				const isLast = reminderNumber >= maxReminders;
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "reminder",
					title: isLast
						? `Final Reminder: ${reminderContext.itemName}`
						: `Reminder: ${reminderContext.itemName}`,
					message: isLast
						? `${reminderContext.itemName} still outstanding after ${reminderNumber} reminders. Workflow will terminate if no response.`
						: `${reminderContext.itemName} is still outstanding (reminder ${reminderNumber}/${maxReminders}).`,
					actionable: true,
				});

				// AM email alert
				await sendInternalAlertEmail({
					title: isLast
						? `Final Reminder: ${reminderContext.itemName}`
						: `Reminder: ${reminderContext.itemName}`,
					message: `${reminderContext.itemName} is outstanding for workflow ${workflowId} (reminder ${reminderNumber}/${maxReminders}).${isLast ? " Application will be terminated if no response is received." : ""}`,
					workflowId,
					applicantId,
					type: isLast ? "warning" : "info",
					actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}${reminderContext.actionTab ? `?tab=${reminderContext.actionTab}` : ""}`,
				});
			}
		);
	}

	// Unreachable — loop always returns or throws via handleWaitTimeout
	throw new Error("unreachable: handleWaitWithReminders loop ended without result");
}
