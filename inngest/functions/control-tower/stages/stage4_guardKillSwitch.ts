import { eq } from "drizzle-orm";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { WORKFLOW_TIMEOUTS } from "@/lib/constants/workflow-timeouts";
import { sendInternalAlertEmail } from "@/lib/services/email.service";
import {
	GREEN_LANE_APPROVER_ID,
	processGreenLaneApproval,
} from "@/lib/services/green-lane.service";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import { guardKillSwitch, notifyApplicantDecline } from "../helpers";
import type { StageDependencies, StageResult } from "../types";

export async function executeStage4({
	step,
	context,
}: StageDependencies): Promise<StageResult> {
	const { workflowId, applicantId } = context;
	const aiAnalysis = context.aiAnalysis as any;
	// Risk Manager final analysis review
	// Green Lane: eligible applicants (score >= 85%, LOW risk, zero flags) bypass manual review
	// ================================================================

	await step.run("stage-4-start", async () => {
		await guardKillSwitch(workflowId, "stage-4-start");
		return updateWorkflowStatus(workflowId, "processing", 4);
	});

	// ================================================================
	// GREEN LANE CHECK: Auto-approve eligible applicants
	// Criteria: aggregatedScore >= 85%, riskLevel = "green", zero flags
	// ================================================================

	const greenLaneResult = await step.run("check-green-lane-eligibility", async () => {
		return processGreenLaneApproval(workflowId, applicantId, aiAnalysis);
	});

	if (greenLaneResult.approved && greenLaneResult.approvalRecord) {
		await step.run("log-green-lane-approval", async () => {
			await logWorkflowEvent({
				workflowId,
				eventType: "green_lane_auto_approved",
				payload: {
					approvedBy: GREEN_LANE_APPROVER_ID,
					approvedAt: greenLaneResult.approvalRecord!.approvedAt,
					eligibilityCriteria: greenLaneResult.eligibilityResult.criteria,
					stage: 4,
				},
				actorType: "platform",
				actorId: GREEN_LANE_APPROVER_ID,
			});

			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "success",
				title: "Green Lane: Automatic Approval",
				message: `Applicant auto-approved via Green Lane. Score: ${greenLaneResult.eligibilityResult.criteria.scoreCheck.value}%, Risk: ${greenLaneResult.eligibilityResult.criteria.riskLevelCheck.value}, Flags: 0. Bypassing manual Stage 4 review.`,
				actionable: false,
			});

			await sendInternalAlertEmail({
				title: "Green Lane: Automatic Approval",
				message: `Applicant has been automatically approved via Green Lane pathway.\n\nEligibility Details:\n- Aggregated Score: ${greenLaneResult.eligibilityResult.criteria.scoreCheck.value}%\n- Risk Level: ${greenLaneResult.eligibilityResult.criteria.riskLevelCheck.value}\n- Flags: None\n\nApproved by: ${GREEN_LANE_APPROVER_ID}\n\nThe applicant will proceed directly to Stage 5 (Contract Review).`,
				workflowId,
				applicantId,
				type: "success",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}`,
			});
		});

		console.info(
			`[Stage4] Green Lane approved: workflow=${workflowId}, applicant=${applicantId}`
		);

		return {
			status: "completed",
			stage: 4,
			data: { greenLaneApproved: true, approvedBy: GREEN_LANE_APPROVER_ID },
		};
	}

	// ================================================================
	// STANDARD PATH: Manual Risk Manager review required
	// ================================================================

	await step.run("notify-final-review", async () => {
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "warning",
			title: "Risk Manager Review Required",
			message: `Aggregated AI score: ${aiAnalysis.scores.aggregatedScore}%. Recommendation: ${aiAnalysis.overall.recommendation}. Flags: ${aiAnalysis.overall.flags.join(", ") || "None"}`,
			actionable: true,
		});

		await sendInternalAlertEmail({
			title: "Risk Manager Review Required",
			message: `Application requires Risk Manager final review.\nAggregated Score: ${aiAnalysis.scores.aggregatedScore}%\nRecommendation: ${aiAnalysis.overall.recommendation}\nFlags: ${aiAnalysis.overall.flags.join(", ") || "None"}`,
			workflowId,
			applicantId,
			type: "warning",
			actionUrl: `${getBaseUrl()}/dashboard/risk-review`,
		});
	});

	await step.run("stage-4-awaiting-review", () =>
		updateWorkflowStatus(workflowId, "awaiting_human", 4)
	);

	let riskDecision = await step.waitForEvent("wait-risk-decision", {
		event: "risk/decision.received",
		timeout: "30d",
		match: "data.workflowId",
	});
	while (!riskDecision) {
		await step.run("notify-am-risk-review-reminder", async () => {
			await guardKillSwitch(workflowId, "notify-am-risk-review-reminder");
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Risk Review Pending",
				message:
					"Risk manager review is still pending. Workflow remains open until a manual decision is recorded.",
				actionable: true,
			});
			await sendInternalAlertEmail({
				title: "Risk Review Reminder",
				message:
					"Risk management review is still pending after 30 days. Workflow stays active and awaits a manual decision.",
				workflowId,
				applicantId,
				type: "warning",
				actionUrl: `${getBaseUrl()}/dashboard/risk-review`,
			});
		});

		riskDecision = await step.waitForEvent("wait-risk-decision-reminder-loop", {
			event: "risk/decision.received",
			timeout: "30d",
			match: "data.workflowId",
		});
	}

	if (riskDecision.data.decision.outcome === "REJECTED") {
		await executeKillSwitch({
			workflowId,
			applicantId,
			reason: "MANUAL_TERMINATION",
			decidedBy: riskDecision.data.decision.decidedBy,
			notes: riskDecision.data.decision.reason,
		});
		await step.run("risk-declined-notify-applicant", async () => {
			await notifyApplicantDecline({
				applicantId,
				workflowId,
				subject: "Facility Application Outcome",
				heading: "Application declined after final risk review",
				message:
					riskDecision.data.decision.reason ||
					"Your application was not approved after final risk review.",
			});
		});
		return { status: "terminated", stage: 4, reason: "Rejected by Risk Manager" };
	}

	// ================================================================
	// HIGH-RISK: Financial Statements Confirmation
	// ================================================================

	const isHighRisk = await step.run("check-high-risk", async () => {
		const db = getDatabaseClient();
		if (!db) return false;
		const [applicant] = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));
		return applicant?.riskLevel === "red";
	});

	if (isHighRisk) {
		await step.run("notify-financial-statements-required", async () => {
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Financial Statements Required (High-Risk)",
				message:
					"This is a high-risk applicant. Please confirm that financial statements have been sent and received before proceeding.",
				actionable: true,
			});

			await sendInternalAlertEmail({
				title: "High-Risk: Financial Statements Required",
				message:
					"High-risk applicant requires financial statements confirmation before proceeding to contract phase.",
				workflowId,
				applicantId,
				type: "warning",
				actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=risk`,
			});
		});

		await step.run("stage-4-awaiting-financial-statements", () =>
			updateWorkflowStatus(workflowId, "awaiting_human", 4)
		);

		const financialStatementsConfirmed = await step.waitForEvent(
			"wait-financial-statements",
			{
				event: "risk/financial-statements.confirmed",
				timeout: WORKFLOW_TIMEOUTS.STAGE,
				match: "data.workflowId",
			}
		);

		if (!financialStatementsConfirmed) {
			await step.run("notify-am-financial-statements-timeout", async () => {
				await guardKillSwitch(workflowId, "notify-am-financial-statements-timeout");
				await createWorkflowNotification({
					workflowId,
					applicantId,
					type: "warning",
					title: "Delay: Financial Statements Required",
					message:
						"High-risk applicant failed to provide financial statements within the timeframe.",
					actionable: true,
				});
				await sendInternalAlertEmail({
					title: "Delay: Financial Statements Required",
					message: `The high-risk applicant has not provided financial statements within the ${WORKFLOW_TIMEOUTS.STAGE} timeout window.`,
					workflowId,
					applicantId,
					type: "warning",
					actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=risk`,
				});
			});
			await step.run("terminate-financial-statements-timeout", () =>
				terminateRun({
					workflowId,
					applicantId,
					stage: 4,
					reason: "STAGE4_FINANCIAL_STATEMENTS_TIMEOUT",
				})
			);
		}

		await step.run("log-financial-statements-confirmed", async () => {
			await logWorkflowEvent({
				workflowId,
				eventType: "financial_statements_confirmed",
				payload: {
					confirmedBy: financialStatementsConfirmed.data.confirmedBy,
					confirmedAt: financialStatementsConfirmed.data.confirmedAt,
				},
			});
		});
	}

	// ================================================================
	return { status: "completed", stage: 4 };
}
