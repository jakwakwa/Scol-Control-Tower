import { getBaseUrl } from "@/app/utils";
import { WORKFLOW_TIMEOUTS } from "@/lib/constants/workflow-timeouts";
import { sendInternalAlertEmail } from "@/lib/services/email.service";
import { createWorkflowNotification } from "@/lib/services/notification-events.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import { guardKillSwitch } from "../helpers";
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

	// Wait for Account Manager to review/edit the contract draft
	const contractReviewed = await step.waitForEvent("wait-contract-reviewed", {
		event: "contract/draft.reviewed",
		timeout: WORKFLOW_TIMEOUTS.REVIEW,
		match: "data.workflowId",
	});

	if (!contractReviewed) {
		await step.run("notify-am-contract-review-timeout", async () => {
			await guardKillSwitch(workflowId, "notify-am-contract-review-timeout");
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Delay: Contract Review",
				message: "The AI-generated contract is stalled awaiting Account Manager review.",
				actionable: true,
			});
			await sendInternalAlertEmail({
				title: "Delay: Contract Review Stalled",
				message: `The contract draft has not been reviewed within the ${WORKFLOW_TIMEOUTS.REVIEW} timeout window. Please review.`,
				workflowId,
				applicantId,
				type: "warning",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=overview`,
			});
		});
		await step.run("terminate-contract-review-timeout", () =>
			terminateRun({
				workflowId,
				applicantId,
				stage: 5,
				reason: "STAGE5_CONTRACT_REVIEW_TIMEOUT",
			})
		);
	}

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

	// Wait for ABSA 6995 form completion
	const absaCompleted = await step.waitForEvent("wait-absa-completed", {
		event: "form/absa-6995.completed",
		timeout: WORKFLOW_TIMEOUTS.REVIEW,
		match: "data.workflowId",
	});

	if (!absaCompleted) {
		await step.run("notify-am-absa-timeout", async () => {
			await guardKillSwitch(workflowId, "notify-am-absa-timeout");
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Delay: ABSA Approval Confirmation",
				message:
					"ABSA approval has not been confirmed within the expected timeframe.",
				actionable: true,
			});
			await sendInternalAlertEmail({
				title: "Delay: ABSA Approval Confirmation",
				message: `ABSA approval has not been confirmed within the ${WORKFLOW_TIMEOUTS.REVIEW} timeout window. Send the packet from the ABSA form page, then confirm approval once ABSA has approved.`,
				workflowId,
				applicantId,
				type: "warning",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
			});
		});
		await step.run("terminate-absa-timeout", () =>
			terminateRun({
				workflowId,
				applicantId,
				stage: 5,
				reason: "STAGE5_ABSA_FORM_TIMEOUT",
			})
		);
	}

	// ================================================================
	return { status: "completed", stage: 5 };
}
