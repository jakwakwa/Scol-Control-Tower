/**
 * StratCol Onboarding Control Tower Workflow
 *
 * Stage 1: Lead Capture & Initiation — Account Manager data entry → Facility dispatch kickoff
 * Stage 2: Facility, Pre-Risk & Quote — Facility app → sales evaluation (+ optional pre-risk sanctions) → mandate mapping → AI quote → Manager review → signed quote → Mandate collection (7-day retry, max 8)
 * Stage 3: Risk assesment
 *    Procurement (api procurecheck api ) + FICA intake (procurecheck) → ITC (XDS API credit bereau) + sanctions (opensanctions (un list, PEP))
 * Stage 4: Risk Review Report risk assesment  -  Risk Manager final review (no auto-approve bypass)
 * Stage 5: Stratcol Agreement Contract              — Account Manager review/edit  contract + ABSA handoff gate = absa approve - send stratcol agreement to external applicant via magic link resend email
 * Stage 6: Final Approval        — Two-factor: Risk Manager + Account Manager → Final contract sent
 *
 * Architecture:
 * - Kill Switch functionality for immediate workflow termination
 * - True parallel processing of procurement and documentation streams
 * - Conditional document logic based on business type
 * - AI agent integration (Validation, Risk, Sanctions) with Reporter Agent
 * - Human approval checkpoints with proper Inngest signal handling
 */

import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflowEvents } from "@/db/schema";
import { ensurePerimeterValidationConfigLoaded } from "@/lib/config/perimeter-validation";
import {
	checkReApplicant,
	logReApplicantAttempt,
} from "@/lib/services/deny-list.service";
import { sendReApplicantDeniedEmail } from "@/lib/services/email.service";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import { logWorkflowEvent } from "@/lib/services/notification-events.service";
import { ensureRiskChecksExist } from "@/lib/services/risk-check.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import {
	LeadCreatedCompatSchema,
	LeadCreatedSchema,
} from "@/lib/validations/control-tower/onboarding-schemas";
import { validatePerimeter } from "@/lib/validations/control-tower/perimeter-validation";
import { inngest } from "../client";

import type {
	ControlTowerEvent,
	ControlTowerStepTools,
	WorkflowContext,
} from "./control-tower/types";

// ============================================
// Constants (re-exported from centralised module)
// ============================================

// @/lib/constants/workflow-timeouts — see imports above.

// ============================================
// Main Control Tower Workflow (SOP-aligned 6-stage)
// ============================================

export const controlTowerWorkflow = inngest.createFunction(
	{
		id: "stratcol-control-tower",
		name: "StratCol Control Tower Onboarding",
		retries: 3,
		cancelOn: [
			{
				event: "workflow/terminated",
				match: "data.workflowId",
			},
		],
	},
	{ event: "onboarding/lead.created" },
	async ({ event, step }: { event: ControlTowerEvent; step: ControlTowerStepTools }) => {
		await ensurePerimeterValidationConfigLoaded();

		const perimeterResult = validatePerimeter({
			schema: LeadCreatedSchema,
			data: event.data,
			eventName: "onboarding/lead.created",
			sourceSystem: "control-tower",
			terminationReason: "VALIDATION_ERROR_INGEST",
			compatibilitySchema: LeadCreatedCompatSchema,
		});

		// Handle validation warnings (warn mode)
		if (perimeterResult.ok && "warning" in perimeterResult) {
			const { warning } = perimeterResult;
			console.warn("[ControlTower] Perimeter validation warning", {
				event: warning.eventName,
				failedPaths: warning.failedPaths,
				messages: warning.messages,
				mode: "warn",
			});

			await step.run("validation-warning-log", async () => {
				await logWorkflowEvent({
					workflowId: perimeterResult.data.workflowId,
					eventType: "validation_completed",
					payload: {
						context: "perimeter_validation_warning",
						eventName: warning.eventName,
						sourceSystem: warning.sourceSystem,
						failedPaths: warning.failedPaths,
						messages: warning.messages,
						validationMode: "warn",
						status: "warning",
					},
				});
			});
		}

		// Handle validation failures (strict mode)
		if (!perimeterResult.ok && "failure" in perimeterResult) {
			const { failure } = perimeterResult;
			console.error("[ControlTower] Perimeter validation failed", {
				event: failure.eventName,
				failedPaths: failure.failedPaths,
				messages: failure.messages,
				mode: failure.validationMode,
			});

			await step.run("validation-failed-terminate", async () => {
				await logWorkflowEvent({
					workflowId: failure.workflowId,
					eventType: "error",
					payload: {
						context: "perimeter_validation_failed",
						eventName: failure.eventName,
						sourceSystem: failure.sourceSystem,
						failedPaths: failure.failedPaths,
						messages: failure.messages,
						validationMode: failure.validationMode,
					},
				});

				if (failure.workflowId > 0 && failure.applicantId > 0) {
					await terminateRun({
						workflowId: failure.workflowId,
						applicantId: failure.applicantId,
						stage: 1,
						reason: failure.terminationReason,
					});
				}
			});
			return;
		}

		const { applicantId, workflowId } = perimeterResult.data;
		const context: WorkflowContext = { applicantId, workflowId };

		console.info(
			`[ControlTower] Starting workflow ${workflowId} for applicant ${applicantId}`
		);

		// Scenario 2b: Re-applicant check — deny if previously declined (ID, bank, cellphone)
		const reApplicantMatch = await step.run("re-applicant-check", async () => {
			return checkReApplicant(applicantId, workflowId);
		});

		if (reApplicantMatch) {
			await step.run("re-applicant-denied-terminate", async () => {
				const db = getDatabaseClient();
				let companyName = "Unknown";
				if (db) {
					const [row] = await db
						.select({ companyName: applicants.companyName })
						.from(applicants)
						.where(eq(applicants.id, applicantId));
					if (row?.companyName) companyName = row.companyName;
				}

				await logReApplicantAttempt({
					applicantId,
					workflowId,
					matchedDenyListId: reApplicantMatch.matchedDenyListId,
					matchedOn: reApplicantMatch.matchedOn,
					matchedValue: reApplicantMatch.matchedValue,
				});

				await sendReApplicantDeniedEmail({
					workflowId,
					applicantId,
					companyName,
					matchedOn: reApplicantMatch.matchedOn,
					matchedValue: reApplicantMatch.matchedValue,
				});

				// Log before executeKillSwitch: cancelOn: workflow/terminated may skip
				// subsequent steps once the cancellation event is emitted
				await logWorkflowEvent({
					workflowId,
					eventType: "re_applicant_denied",
					payload: {
						matchedOn: reApplicantMatch.matchedOn,
						matchedValue: reApplicantMatch.matchedValue,
						matchedDenyListId: reApplicantMatch.matchedDenyListId,
					},
				});

				await executeKillSwitch({
					workflowId,
					applicantId,
					reason: "RE_APPLICANT_DENIED",
					decidedBy: "system",
					notes: `Re-applicant matched on ${reApplicantMatch.matchedOn}: ${reApplicantMatch.matchedValue}`,
				});
			});
			return; // Terminate workflow run
		}

		await step.run("seed-risk-check-rows", () =>
			ensureRiskChecksExist(workflowId, applicantId)
		);

		console.info("[ControlTower] Routing to Modular Orchestrator");
		const { runControlTowerOrchestrator } = await import(
			"./control-tower/ControlTowerOrchestrator"
		);
		return runControlTowerOrchestrator({
			event,
			step,
			context,
		});
	}
);

export const killSwitchHandler = inngest.createFunction(
	{
		id: "stratcol-kill-switch-handler",
		name: "Kill Switch Handler",
	},
	{ event: "workflow/terminated" },
	async ({ event, step }) => {
		const { workflowId, reason, decidedBy, terminatedAt } = event.data;

		await step.run("log-termination", async () => {
			const db = getDatabaseClient();
			if (!db) return;

			await db.insert(workflowEvents).values({
				workflowId,
				eventType: "kill_switch_handled",
				payload: JSON.stringify({
					reason,
					decidedBy,
					terminatedAt,
					handledAt: new Date().toISOString(),
				}),
			});
		});

		return {
			handled: true,
			workflowId,
			reason,
		};
	}
);
