import { eq } from "drizzle-orm";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants, workflows } from "@/db/schema";
import { WORKFLOW_TIMEOUTS, REMINDER_INTERVALS } from "@/lib/constants/workflow-timeouts";
import {
	sendApplicantFormLinksEmail,
	sendApplicantReminderEmail,
	sendInternalAlertEmail,
} from "@/lib/services/email.service";
import { createFormInstance } from "@/lib/services/form.service";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import type { FormType } from "@/lib/types";
import { inngest } from "../../../client";
import { guardKillSwitch } from "../helpers";
import type { StageDependencies, StageResult } from "../types";

export async function executeStage6({
	step,
	context,
}: StageDependencies): Promise<StageResult> {
	const { workflowId, applicantId } = context;
	// Note: These variables were passed from earlier stages in the monolith.
	// We handle them by asserting or fetching if missing, or passing them via context.data.
	const mandateInfo =
		(context.mandateInfo as { businessType?: string } | undefined) || {
			businessType: "UNKNOWN",
		};
	// Risk Manager + Account Manager must both approve
	// ================================================================

	await step.run("stage-6-start", async () => {
		await guardKillSwitch(workflowId, "stage-6-start");
		return updateWorkflowStatus(workflowId, "processing", 6);
	});

	await step.run("notify-two-factor-approval", async () => {
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "awaiting",
			title: "Two-Factor Final Approval Required",
			message:
				"Both Risk Manager and Account Manager must approve to complete onboarding.",
			actionable: true,
		});

		await sendInternalAlertEmail({
			title: "Two-Factor Final Approval Required",
			message:
				"Application is ready for final approval. Both Risk Manager and Account Manager must approve.",
			workflowId,
			applicantId,
			type: "info",
			actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
		});
	});

	await step.run("stage-6-awaiting-approvals", () =>
		updateWorkflowStatus(workflowId, "awaiting_human", 6)
	);

	// Wait for both approvals (can arrive in any order)
	const [riskManagerApproval, accountManagerApproval] = await Promise.all([
		step.waitForEvent("wait-risk-manager-approval", {
			event: "approval/risk-manager.received",
			timeout: WORKFLOW_TIMEOUTS.REVIEW,
			match: "data.workflowId",
		}),
		step.waitForEvent("wait-account-manager-approval", {
			event: "approval/account-manager.received",
			timeout: WORKFLOW_TIMEOUTS.REVIEW,
			match: "data.workflowId",
		}),
	]);

	// Check for approval timeouts (both can timeout)
	const missingApprovals: Array<'risk' | 'account'> = [];
	if (!riskManagerApproval) missingApprovals.push('risk');
	if (!accountManagerApproval) missingApprovals.push('account');

	if (missingApprovals.length > 0) {
		// Send notifications per approval type in separate steps to avoid duplicate
		// notifications/emails on retries (each step is idempotent in scope)
		if (missingApprovals.includes("risk")) {
			await step.run("notify-risk-approval-timeout", async () => {
				await guardKillSwitch(workflowId, "notify-risk-approval-timeout");
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Delay: Final Risk Approval",
					message: "Final risk manager approval timed out.",
					actionable: true,
				});
				await sendInternalAlertEmail({
					title: "Delay: Final Risk Approval",
					message: `The final risk manager approval has not been completed within the ${WORKFLOW_TIMEOUTS.REVIEW} timeout window.`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
				});
			});
		}
		if (missingApprovals.includes("account")) {
			await step.run("notify-account-approval-timeout", async () => {
				await guardKillSwitch(workflowId, "notify-account-approval-timeout");
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Delay: Final Account Manager Approval",
					message: "Final account manager approval timed out.",
					actionable: true,
				});
				await sendInternalAlertEmail({
					title: "Delay: Final Account Manager Approval",
					message: `The final account manager approval has not been completed within the ${WORKFLOW_TIMEOUTS.REVIEW} timeout window.`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
				});
			});
		}

		// Determine termination reason based on which approvals timed out
		const terminationReason: "STAGE6_RISK_MANAGER_TIMEOUT" |"STAGE6_ACCOUNT_MANAGER_TIMEOUT"|"STAGE6_RISK_AND_ACCOUNT_MANAGER_TIMEOUT" =
		missingApprovals.includes("risk") && missingApprovals.includes("account")
			? "STAGE6_RISK_AND_ACCOUNT_MANAGER_TIMEOUT"
			: missingApprovals.includes("risk")
				? "STAGE6_RISK_MANAGER_TIMEOUT"
				: "STAGE6_ACCOUNT_MANAGER_TIMEOUT";

		const notes = missingApprovals.includes('risk') && missingApprovals.includes('account')
			? "Both risk manager and account manager approvals timed out."
			: undefined;

		await step.run("terminate-approval-timeout", () =>
			terminateRun({
				workflowId,
				applicantId,
				stage: 6,
				reason: terminationReason,
				notes,
			})
		);

		return {
			status: "terminated" as const,
			stage: 6,
			reason: `Approval timeout: ${terminationReason}`,
		};
	}

	if (accountManagerApproval.data.decision === "REJECTED") {
		await executeKillSwitch({
			workflowId,
			applicantId,
			reason: "MANUAL_TERMINATION",
			decidedBy: accountManagerApproval.data.approvedBy,
			notes:
				accountManagerApproval.data.reason ||
				"Rejected at final approval by Account Manager",
		});
		return {
			status: "terminated",
			stage: 6,
			reason: "Rejected by Account Manager at final approval",
		};
	}

	// Persist Approvals
	await step.run("persist-approvals", async () => {
		const db = getDatabaseClient();
		if (!db) return;

		// Persist both approvals
		await db
			.update(workflows)
			.set({
				riskManagerApproval: JSON.stringify({
					approvedBy: riskManagerApproval.data.approvedBy,
					timestamp: riskManagerApproval.data.timestamp,
					decision: riskManagerApproval.data.decision,
				}),
				accountManagerApproval: JSON.stringify({
					approvedBy: accountManagerApproval.data.approvedBy,
					timestamp: accountManagerApproval.data.timestamp,
					decision: accountManagerApproval.data.decision,
				}),
			})
			.where(eq(workflows.id, workflowId));
	});

	// Emit final approval event (two-factor complete)
	await step.run("emit-final-approval", async () => {
		await inngest.send({
			name: "onboarding/final-approval.received",
			data: {
				workflowId,
				applicantId,
				riskManagerApproval: {
					approvedBy: riskManagerApproval.data.approvedBy,
					timestamp: riskManagerApproval.data.timestamp,
				},
				accountManagerApproval: {
					approvedBy: accountManagerApproval.data.approvedBy,
					timestamp: accountManagerApproval.data.timestamp,
				},
				contractSigned: true,
				absaFormComplete: true,
				timestamp: new Date().toISOString(),
			},
		});
	});

	await step.run("send-final-contract-to-applicant", async () => {
		await guardKillSwitch(workflowId, "send-final-contract-to-applicant");

		const db = getDatabaseClient();
		if (!db) throw new Error("Database connection failed");

		const [applicant] = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));
		if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

		const contractToken = await createFormInstance({
			applicantId,
			workflowId,
			formType: "AGREEMENT_CONTRACT" as FormType,
		});

		await sendApplicantFormLinksEmail({
			email: applicant.email,
			contactName: applicant.contactName,
			links: [
				{
					formType: "AGREEMENT_CONTRACT",
					url: `${getBaseUrl()}/forms/${contractToken.token}`,
				},
			],
		});

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "success",
			title: "Final Contract Sent to Applicant",
			message:
				"Two-factor approvals are complete and the final contract link has been sent to the applicant.",
			actionable: false,
		});
	});

	// ================================================================
	// COMPLETION
	// ================================================================

	await step.run("workflow-complete", async () => {
		await updateWorkflowStatus(workflowId, "completed", 6);

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "success",
			title: "Onboarding Complete",
			message:
				"Client onboarding has been successfully completed with two-factor approval.",
			actionable: false,
		});

		await logWorkflowEvent({
			workflowId,
			eventType: "workflow_completed",
			payload: {
				completedAt: new Date().toISOString(),
				riskManagerApproval: riskManagerApproval.data.approvedBy,
				accountManagerApproval: accountManagerApproval.data.approvedBy,
				businessType: mandateInfo.businessType,
			},
		});
	});

	// ================================================================
	// CONTRACT SIGNATURE FOLLOW-UP (NON-BLOCKING WITH REMINDERS)
	// ================================================================
	// Two-factor approvals are the completion gate for Stage 6.
	// We still observe applicant contract decisions for ops visibility,
	// and send reminder nudges if they don't respond.

	const maxReminders = REMINDER_INTERVALS.MAX_REMINDERS;
	const waitDurations = [
		REMINDER_INTERVALS.FIRST_NUDGE,
		...(maxReminders >= 2 ? [REMINDER_INTERVALS.SECOND_NUDGE] : []),
		WORKFLOW_TIMEOUTS.REVIEW,
	];

	let contractDecision = null;

	for (let i = 0; i < waitDurations.length; i++) {
		const stepSuffix = i === 0 ? "" : `-reminder-${i}`;

		contractDecision = await step.waitForEvent(`wait-contract-decision${stepSuffix}`, {
			event: "form/decision.responded",
			timeout: waitDurations[i],
			if: "event.data.workflowId == async.data.workflowId && event.data.formType == 'AGREEMENT_CONTRACT'",
		});

		if (contractDecision) break;

		// Last wait — just warn, don't terminate (non-blocking)
		if (i === waitDurations.length - 1) {
			await step.run("notify-contract-signature-delay", async () => {
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Delay: Contract Signature",
					message:
						"Applicant has not signed the final contract within the expected timeframe.",
					actionable: true,
				});
				await sendInternalAlertEmail({
					title: "Delay: Contract Signature",
					message: `Applicant has not signed the final contract within the ${WORKFLOW_TIMEOUTS.REVIEW} timeout window. Please follow up.`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
				});
			});
			break;
		}

		// Intermediate: send applicant reminder
		const reminderNumber = i + 1;
		await step.run(`send-contract-signature-reminder-${reminderNumber}`, async () => {
			await guardKillSwitch(workflowId, `send-contract-signature-reminder-${reminderNumber}`);

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
						itemName: "Agreement Contract",
						reminderNumber,
						maxReminders,
					});
				}
			}

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "reminder",
				title: `Reminder: Agreement Contract Signature`,
				message: `Agreement contract is still awaiting applicant signature (reminder ${reminderNumber}/${maxReminders}).`,
				actionable: true,
			});

			await logWorkflowEvent({
				workflowId,
				eventType: "reminder_sent",
				payload: {
					stage: 6,
					itemName: "Agreement Contract",
					reminderNumber,
					maxReminders,
				},
			});
		});
	}

	if (contractDecision && contractDecision.data.decision === "DECLINED") {
		await step.run("contract-declined-notify", async () => {
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Contract Declined by Applicant",
				message:
					contractDecision.data.reason ||
					"Applicant declined to sign the final contract.",
				actionable: true,
			});
			await sendInternalAlertEmail({
				title: "Contract Declined by Applicant",
				message: `Applicant declined the final contract${contractDecision.data.reason ? `: ${contractDecision.data.reason}` : "."}`,
				workflowId,
				applicantId,
				type: "warning",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
			});
		});
	}

	return {
		status: "completed",
		stage: 6,
	};
}
// Return relies on the function body's final returns.
