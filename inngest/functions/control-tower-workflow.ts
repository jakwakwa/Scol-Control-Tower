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

import { getDatabaseClient } from "@/app/utils";
import { workflowEvents } from "@/db/schema";
import { logWorkflowEvent } from "@/lib/services/notification-events.service";
import { terminateRun } from "@/lib/services/terminate-run.service";
import { LeadCreatedSchema } from "@/lib/validations/control-tower/onboarding-schemas";
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
		// 1. Perimeter Zod Validation
		const validationResult = LeadCreatedSchema.safeParse(event.data);

		if (!validationResult.success) {
			console.error("[ControlTower] Validation failed for onboarding/lead.created", {
				event: event.name,
				errors: validationResult.error.format(),
			});

			await step.run("validation-failed-terminate", async () => {
				const data = event.data as Record<string, unknown>;
				const applicantId = typeof data.applicantId === "number" ? data.applicantId : 0;
				const workflowId = typeof data.workflowId === "number" ? data.workflowId : 0;

				await logWorkflowEvent({
					workflowId,
					eventType: "error",
					payload: {
						context: "perimeter_validation_failed",
						errors: validationResult.error.format(),
					},
				});

				// Only terminate if we have valid IDs
				if (workflowId > 0 && applicantId > 0) {
					await terminateRun({
						workflowId,
						applicantId,
						stage: 1,
						reason: "VALIDATION_ERROR_INGEST",
					});
				}
			});
			return; // Short-circuit the run completely
		}

		// Validation passed, use strongly typed data
		const { applicantId, workflowId } = validationResult.data;
		const context: WorkflowContext = { applicantId, workflowId };

		console.info(
			`[ControlTower] Starting workflow ${workflowId} for applicant ${applicantId}`
		);

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
