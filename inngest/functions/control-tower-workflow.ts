/**
 * StratCol Onboarding Control Tower Workflow — SOP-Aligned (6-Stage)
 *
 * Stage 1: Lead Capture & Initiation — Account Manager data entry → Facility dispatch kickoff
 * Stage 2: Facility, Pre-Risk & Quote — Facility app → sales evaluation (+ optional pre-risk sanctions) → mandate mapping → AI quote → Manager review → signed quote → Mandate collection (7-day retry, max 8)
 * Stage 3: Procurement & AI     — Parallel: Procurement risk + FICA intake → ITC + sanctions (main check) → AI multi-agent analysis + Reporter Agent
 * Stage 4: Risk Review           — Risk Manager final review (no auto-approve bypass)
 * Stage 5: Contract              — Account Manager review/edit AI contract + ABSA handoff gate
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
import {
	checkReApplicant,
	logReApplicantAttempt,
} from "@/lib/services/deny-list.service";
import { sendReApplicantDeniedEmail } from "@/lib/services/email.service";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import { logWorkflowEvent } from "@/lib/services/notification-events.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { LeadCreatedSchema } from "@/lib/validations/control-tower/onboarding-schemas";
import { validatePerimeter } from "@/lib/validations/control-tower/perimeter-validation";
import { inngest } from "../client";

import type { WorkflowContext } from "./control-tower/types";

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
			{
				event: "sanction/confirmed",
				match: "data.workflowId",
			},
		],
	},
	{ event: "onboarding/lead.created" },
	async ({ event, step }) => {
		const perimeterResult = validatePerimeter({
			schema: LeadCreatedSchema,
			data: event.data,
			eventName: "onboarding/lead.created",
			sourceSystem: "control-tower",
			terminationReason: "VALIDATION_ERROR_INGEST",
		});

		if (!perimeterResult.ok) {
			const { failure } = perimeterResult;
			console.error("[ControlTower] Perimeter validation failed", {
				event: failure.eventName,
				failedPaths: failure.failedPaths,
				messages: failure.messages,
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

		console.info("[ControlTower] Routing to Modular Orchestrator");
		const { runControlTowerOrchestrator } = await import(
			"./control-tower/ControlTowerOrchestrator"
		);
		return runControlTowerOrchestrator({
			event: event as any, // Cast to any to bypass exact inferred event match since we are inside the same handler
			step: step as any,
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
