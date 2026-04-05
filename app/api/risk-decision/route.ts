/**
 * Risk Decision API - Control Tower Endpoint
 *
 * Allows the Risk Manager to approve/reject a client application.
 * Sends the 'risk/decision.received' event to Inngest to resume the Saga.
 *
 * V2: Captures structured adjudication data for AI retraining pipeline.
 * Every human decision creates a structured feedback log that maps
 * directly to how the AI failed, enabling programmatic retraining.
 *
 * POST /api/risk-decision
 * Body: { workflowId, applicantId, decision: { outcome, adjudicationReason, ... } }
 */

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { hasPermissionOrAdmin } from "@/lib/auth/permissions";
import { ADJUDICATION_CATEGORIES } from "@/lib/constants/adjudication-taxonomy";
import { captureServerEvent } from "@/lib/posthog-server";
import { recordFeedbackLog } from "@/lib/services/divergence.service";
import { acquireStateLock } from "@/lib/services/state-lock.service";

// ============================================
// Request Schema — Structured Adjudication Data
// ============================================

const RiskDecisionSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	relatedFailureEventId: z.number().int().positive().optional(),
	decision: z.object({
		outcome: z.enum(["APPROVED", "REJECTED", "REQUEST_MORE_INFO"]),
		adjudicationReason: z.enum(ADJUDICATION_CATEGORIES),
		adjudicationDetail: z.string().max(500),
		adjudicationNotes: z.string().max(300).optional(),
		conditions: z.array(z.string()).optional(),
	}),
});

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
	try {
		// Authenticate and check permission (org:risk_assessment:approve or adjudication_denied — risk_manager)
		const { userId, has, orgRole } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized - Authentication required" },
				{ status: 401 }
			);
		}
		// Parse and validate request body
		const body = await request.json();
		const validationResult = RiskDecisionSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { workflowId, applicantId, decision, relatedFailureEventId } =
			validationResult.data;
		const adjudicationReason = decision.adjudicationReason;
		const adjudicationDetail = decision.adjudicationDetail;
		const adjudicationNotes = decision.adjudicationNotes;

		// Check outcome-specific permission (org:risk_assessment — risk_manager, admin)
		const canApprove = hasPermissionOrAdmin(has, orgRole, "org:risk_assessment:approve");
		const canAdjudicationDenied = hasPermissionOrAdmin(
			has,
			orgRole,
			"org:risk_assessment:adjudication_denied"
		);
		const needsApprove =
			decision.outcome === "APPROVED" || decision.outcome === "REQUEST_MORE_INFO";
		const needsAdjudicationDenied = decision.outcome === "REJECTED";
		if (needsApprove && !canApprove) {
			return NextResponse.json(
				{ error: "Forbidden - Missing org:risk_assessment:approve permission" },
				{ status: 403 }
			);
		}
		if (needsAdjudicationDenied && !canAdjudicationDenied) {
			return NextResponse.json(
				{
					error: "Forbidden - Missing org:risk_assessment:adjudication_denied permission",
				},
				{ status: 403 }
			);
		}

		// Verify workflow exists and is in awaiting_human state
		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const workflowResult = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId));

		const workflow = workflowResult[0];
		if (!workflow) {
			return NextResponse.json(
				{ error: `Workflow ${workflowId} not found` },
				{ status: 404 }
			);
		}

		// Validate workflow is awaiting human decision
		if (workflow.status !== "awaiting_human" && workflow.status !== "pending") {
			console.warn(
				`[RiskDecision] Workflow ${workflowId} is in unexpected state: ${workflow.status}`
			);
			// Allow anyway - the Inngest event handler will determine if it's valid
		}

		// Acquire state lock to prevent ghost processes from overwriting this finalized decision
		await acquireStateLock(workflowId, userId);

		// Log the decision event to the database (legacy event log)
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "human_adjudication",
			payload: JSON.stringify({
				decision: decision.outcome,
				adjudicationReason: decision.adjudicationReason,
				adjudicationDetail: decision.adjudicationDetail,
				adjudicationNotes: decision.adjudicationNotes,
				conditions: decision.conditions,
				fromStage: workflow.stage,
				toStage: workflow.stage,
				relatedFailureEventId,
			}),
			actorId: userId,
			actorType: "user",
		});

		// Record structured feedback log for AI retraining pipeline
		const feedbackResult = await recordFeedbackLog({
			workflowId,
			applicantId,
			humanOutcome: decision.outcome,
			adjudicationReason,
			adjudicationDetail,
			adjudicationNotes,
			decidedBy: userId,
			relatedFailureEventId,
		});

		if (!feedbackResult.success) {
			console.warn("[RiskDecision] Failed to record feedback log:", feedbackResult.error);
		}

		if (
			decision.adjudicationDetail.trim().length > 0 ||
			(decision.adjudicationNotes && decision.adjudicationNotes.trim().length > 0)
		) {
			const latestAnalysis = await db
				.select()
				.from(aiAnalysisLogs)
				.where(
					and(
						eq(aiAnalysisLogs.workflowId, workflowId),
						eq(aiAnalysisLogs.agentName, "reporter")
					)
				)
				.orderBy(desc(aiAnalysisLogs.createdAt))
				.limit(1);

			if (latestAnalysis.length > 0) {
				const logId = latestAnalysis[0].id;

				await db
					.update(aiAnalysisLogs)
					.set({ humanAdjudicationReason: adjudicationReason })
					.where(eq(aiAnalysisLogs.id, logId));
			}
		}

		// Send the event to Inngest to resume the workflow
		await inngest.send({
			name: "risk/decision.received",
			data: {
				workflowId,
				applicantId,
				decision: {
					outcome: decision.outcome,
					decidedBy: userId,
					adjudicationReason,
					adjudicationDetail,
					adjudicationNotes,
					conditions: decision.conditions,
					timestamp: new Date().toISOString(),
				},
			},
		});

		captureServerEvent({
			distinctId: userId,
			event: "risk_decision_submitted",
			properties: {
				workflow_id: workflowId,
				applicant_id: applicantId,
				outcome: decision.outcome,
				adjudication_reason: adjudicationReason,
				adjudication_detail: adjudicationDetail,
				is_divergent: feedbackResult.isDivergent,
			},
		});

		// Return success response
		return NextResponse.json({
			success: true,
			message: `Risk decision recorded: ${decision.outcome}`,
			workflowId,
			applicantId,
			decision: {
				outcome: decision.outcome,
				adjudicationReason: decision.adjudicationReason,
				adjudicationDetail: decision.adjudicationDetail,
				adjudicationNotes: decision.adjudicationNotes ?? "",
				decidedBy: userId,
				timestamp: new Date().toISOString(),
			},
			feedback: {
				feedbackLogId: feedbackResult.feedbackLogId,
				isDivergent: feedbackResult.isDivergent,
			},
		});
	} catch (error) {
		console.error("[RiskDecision] Error processing decision:", error);

		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

// ============================================
// GET Handler - Retrieve pending decisions
// ============================================

export async function GET(_request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Get workflows awaiting risk decision
		const pendingWorkflows = await db
			.select()
			.from(workflows)
			.where(eq(workflows.status, "awaiting_human"));

		return NextResponse.json({
			count: pendingWorkflows.length,
			workflows: pendingWorkflows.map(w => ({
				workflowId: w.id,
				applicantId: w.applicantId,
				stage: w.stage,
				startedAt: w.startedAt,
			})),
		});
	} catch (error) {
		console.error("[RiskDecision] Error fetching pending decisions:", error);

		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
