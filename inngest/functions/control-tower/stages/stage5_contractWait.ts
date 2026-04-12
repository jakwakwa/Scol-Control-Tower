import { getBaseUrl } from "@/app/utils";
import { guardKillSwitch } from "@/inngest/utils/guards";
import { WORKFLOW_TIMEOUTS } from "@/lib/constants/workflow-timeouts";
import { sendInternalAlertEmail } from "@/lib/services/email.service";
import { createWorkflowNotification } from "@/lib/services/notification-events.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import { handleWaitWithReminders } from "../../handlers/reminder-handler";
import type { StageDependencies, StageResult } from "../types";

export async function executeStage5({
	step,
	context,
}: StageDependencies): Promise<StageResult> {
	const { workflowId, applicantId } = context;
	// Account Manager review/edit AI contract → Send contract + ABSA form
	// ================================================================

	await step.run("stage-5-start", async () => {
		await guardKillSwitch(workflowId, "stage-5-start");
		return updateWorkflowStatus(workflowId, "processing", 5);
	});

	// Step 5.1: Notify Account Manager to review/edit contract draft
	await step.run("notify-contract-review", async () => {
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "awaiting",
			title: "Contract Draft Ready for Review",
			message:
				"Please review and edit the AI-generated contract before sending to client.",
			actionable: true,
		});

		await sendInternalAlertEmail({
			title: "Contract Draft Ready for Review",
			message:
				"AI-generated contract is ready for Account Manager review and editing before sending to client.",
			workflowId,
			applicantId,
			type: "info",
			actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=overview`,
		});
	});

	await step.run("stage-5-awaiting-contract-review", () =>
		updateWorkflowStatus(workflowId, "awaiting_human", 5)
	);

	// Wait for Account Manager to review/edit the contract draft (AM-only reminders)
	const _contractReviewed = await handleWaitWithReminders({
		step,
		workflowId,
		applicantId,
		stage: 5,
		waitStepId: "wait-contract-reviewed",
		eventName: "contract/draft.reviewed",
		totalTimeout: WORKFLOW_TIMEOUTS.REVIEW,
		terminationReason: "STAGE5_CONTRACT_REVIEW_TIMEOUT",
		reminderContext: {
			itemName: "Contract Draft Review",
			actionTab: "overview",
		},
		internalOnly: true,
	});

	// Step 5.2: Record that final contract delivery happens only after approvals
	await step.run("notify-stage-5-gates", async () => {
		await guardKillSwitch(workflowId, "notify-stage-5-gates");
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "awaiting",
			title: "Contract + ABSA Internal Gates",
			message:
				"Awaiting internal contract review and ABSA approval confirmation. Final contract is sent to applicant only after two-factor final approval.",
			actionable: true,
		});
	});

	await step.run("stage-5-awaiting-docs", () =>
		updateWorkflowStatus(workflowId, "awaiting_human", 5)
	);

	// Wait for ABSA 6995 form completion (AM-only reminders)
	const _absaCompleted = await handleWaitWithReminders({
		step,
		workflowId,
		applicantId,
		stage: 5,
		waitStepId: "wait-absa-completed",
		eventName: "form/absa-6995.completed",
		totalTimeout: WORKFLOW_TIMEOUTS.REVIEW,
		terminationReason: "STAGE5_ABSA_FORM_TIMEOUT",
		reminderContext: {
			itemName: "ABSA 6995 Form",
		},
		internalOnly: true,
	});

	// ================================================================
	return { status: "completed", stage: 5 };
}
