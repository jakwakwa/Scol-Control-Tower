import { eq } from "drizzle-orm";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { WORKFLOW_TIMEOUTS } from "@/lib/constants/workflow-timeouts";
import { sendInternalAlertEmail } from "@/lib/services/email.service";
import {
	applyGreenLanePass,
	hasManualGreenLaneRequest,
	isGreenLaneEligible,
} from "@/lib/services/green-lane.service";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import {
	getHybridGateStatus,
	updateRiskCheckReviewState,
} from "@/lib/services/risk-check.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { updateWorkflowStatus } from "@/lib/services/workflow.service";
import { guardKillSwitch } from "../../../utils/guards";
import { notifyApplicantDecline } from "../../../utils/helpers";
import type { StageDependencies, StageResult } from "../types";

export async function executeStage4({
	step,
	context,
}: StageDependencies): Promise<StageResult> {
	const { workflowId, applicantId } = context;

	await step.run("stage-4-start", async () => {
		await guardKillSwitch(workflowId, "stage-4-start");
		return updateWorkflowStatus(workflowId, "processing", 4);
	});

	await step.run("run-financial-risk-agent", async () => {
		const { runFinancialRiskAgent } = await import(
			"@/lib/services/agents/financial-risk.agent"
		);
		await runFinancialRiskAgent({ workflowId, applicantId, stage: 4 });
	});

	const gateStatus = await step.run("read-hybrid-gate", () =>
		getHybridGateStatus(workflowId)
	);

	const checkSummary = gateStatus.checks
		.map(c => `${c.checkType}: ${c.machineState}`)
		.join(", ");

	// ================================================================
	// PROCUREMENT GATE: Independent procurement adjudication
	// Only triggers when procurement is in manual_required state.
	// When procurement completed successfully in Stage 3, this is skipped.
	// ================================================================
	const procurementCheck = gateStatus.checks.find(c => c.checkType === "PROCUREMENT");
	const procurementNeedsReview =
		procurementCheck?.machineState === "manual_required" &&
		procurementCheck?.reviewState !== "approved" &&
		procurementCheck?.reviewState !== "rejected";

	if (procurementNeedsReview) {
		await step.run("notify-procurement-review-required", async () => {
			await createWorkflowNotification({
				workflowId,
				applicantId,
				type: "warning",
				title: "Procurement Manual Review Required",
				message:
					"ProcureCheck results require Risk Manager adjudication. Other risk checks are unaffected.",
				actionable: true,
			});
			await sendInternalAlertEmail({
				title: "Procurement Manual Review Required",
				message:
					"ProcureCheck results need manual adjudication. The general risk review will follow after procurement is resolved.",
				workflowId,
				applicantId,
				type: "warning",
				actionUrl: `${getBaseUrl()}/dashboard/risk-review`,
			});
		});

		const procDecision = await step.waitForEvent("wait-procurement-decision", {
			event: "risk/procurement.completed",
			timeout: "30d",
			match: "data.workflowId",
		});

		if (!procDecision) {
			return {
				status: "terminated",
				stage: 4,
				reason: "Procurement review timed out after 30 days",
			};
		}

		if (procDecision.data.decision.outcome === "DENIED") {
			// Kill switch already triggered by the API route
			await step.run("log-procurement-denied-stage4", async () => {
				await logWorkflowEvent({
					workflowId,
					eventType: "procurement_decision",
					payload: {
						outcome: "DENIED",
						stage: 4,
						decidedBy: procDecision.data.decision.decidedBy,
						reason: procDecision.data.decision.adjudicationNotes,
					},
				});
			});
			return {
				status: "terminated",
				stage: 4,
				reason: "Procurement denied by Risk Manager",
			};
		}

		// CLEARED: update review state
		await step.run("procurement-cleared-update", async () => {
			await updateRiskCheckReviewState(
				workflowId,
				"PROCUREMENT",
				"approved",
				procDecision.data.decision.decidedBy,
				procDecision.data.decision.adjudicationNotes
			);
			await logWorkflowEvent({
				workflowId,
				eventType: "procurement_decision",
				payload: {
					outcome: "CLEARED",
					stage: 4,
					decidedBy: procDecision.data.decision.decidedBy,
					timestamp: procDecision.data.decision.timestamp,
				},
			});
		});
	}

	const isHighRisk = await step.run("check-high-risk", async () => {
		const db = getDatabaseClient();
		if (!db) return false;
		const [applicant] = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));
		return applicant?.riskLevel === "red";
	});

	// Manual Green Lane: AM already granted before Stage 4 — short-circuit like auto
	const manualGreenLane = await step.run("check-manual-green-lane", () =>
		hasManualGreenLaneRequest(workflowId)
	);

	if (manualGreenLane) {
		if (!isHighRisk) {
			await step.run("apply-manual-green-lane-pass", () =>
				applyGreenLanePass(workflowId, {
					source: "manual_am",
					checkSummary,
				})
			);
			return { status: "completed", stage: 4 };
		}

		await step.run("log-manual-green-lane-blocked-high-risk", () =>
			logWorkflowEvent({
				workflowId,
				eventType: "green_lane_blocked",
				payload: {
					reason: "high_risk_requires_financial_statements",
					checkSummary,
				},
			})
		);
	}

	// Automatic Green Lane: eligibility-based bypass
	const greenLaneEligibility = await step.run("check-green-lane-eligibility", () =>
		isGreenLaneEligible(workflowId)
	);

	if (greenLaneEligibility.eligible) {
		await step.run("apply-automatic-green-lane-pass", () =>
			applyGreenLanePass(workflowId, {
				source: "automatic",
				checkSummary,
				eligibilitySummary: greenLaneEligibility.summary,
			})
		);
		return { status: "completed", stage: 4 };
	}

	await step.run("notify-final-review", async () => {
		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "warning",
			title: "Risk Manager Review Required",
			message: `All risk checks complete. Status: ${checkSummary}. Risk Manager must review and approve each section.`,
			actionable: true,
		});

		await sendInternalAlertEmail({
			title: "Risk Manager Review Required",
			message: `Application requires Risk Manager final review.\nCheck results: ${checkSummary}`,
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
		const adjudicationMessage =
			riskDecision.data.decision.adjudicationNotes ||
			riskDecision.data.decision.adjudicationDetail ||
			"Your application was not approved after final risk review.";

		await executeKillSwitch({
			workflowId,
			applicantId,
			reason: "MANUAL_TERMINATION",
			decidedBy: riskDecision.data.decision.decidedBy,
			notes: adjudicationMessage,
		});
		await step.run("risk-declined-notify-applicant", async () => {
			await notifyApplicantDecline({
				applicantId,
				workflowId,
				subject: "Facility Application Outcome",
				heading: "Application declined after final risk review",
				message: adjudicationMessage,
			});
		});
		return { status: "terminated", stage: 4, reason: "Rejected by Risk Manager" };
	}

	// Manual Green Lane granted while Stage 4 was awaiting review — apply pass and skip high-risk branch
	const decisionPayload = riskDecision.data.decision as { source?: string };
	if (decisionPayload.source === "manual_green_lane") {
		if (!isHighRisk) {
			await step.run("apply-manual-green-lane-pass-from-event", () =>
				applyGreenLanePass(workflowId, {
					source: "manual_am",
					checkSummary: "Manual Green Lane granted while awaiting review",
				})
			);
			return { status: "completed", stage: 4 };
		}

		await step.run("log-manual-green-lane-blocked-high-risk-from-event", () =>
			logWorkflowEvent({
				workflowId,
				eventType: "green_lane_blocked",
				payload: {
					reason: "high_risk_requires_financial_statements",
					checkSummary: "Manual Green Lane granted while awaiting review",
				},
			})
		);
	}

	// ================================================================
	// HIGH-RISK: Financial Statements Confirmation
	// ================================================================

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
