/**
 * Risk Decision API - Control Tower Endpoint
 *
 * Allows the Risk Manager to approve/reject a client application.
 * Sends the 'risk/decision.received' event to Inngest to resume the Saga.
 *
 * V2: Captures structured override data for AI retraining pipeline.
 * Every human decision creates a structured feedback log that maps
 * directly to how the AI failed, enabling programmatic retraining.
 *
 * POST /api/risk-decision
 * Body: { workflowId, applicantId, decision: { outcome, overrideCategory, ... } }
 */

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { hasPermissionOrAdmin } from "@/lib/auth/permissions";
import { OVERRIDE_CATEGORIES } from "@/lib/constants/override-taxonomy";
import { recordFeedbackLog } from "@/lib/services/divergence.service";
import { acquireStateLock } from "@/lib/services/state-lock.service";

// ============================================
// Request Schema — Structured Override Data
// ============================================

const RiskDecisionSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	relatedFailureEventId: z.number().int().positive().optional(),
	decision: z.object({
		outcome: z.enum(["APPROVED", "REJECTED", "REQUEST_MORE_INFO"]),
		reason: z.string().optional(),
		overrideCategory: z.enum(OVERRIDE_CATEGORIES),
		overrideSubcategory: z.string().optional(),
		overrideDetails: z.string().max(500).optional(),
		conditions: z.array(z.string()).optional(),
	}),
});

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
	try {
		// Authenticate and check permission (org:risk_assessment:approve or override_denied — risk_manager)
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

		const { workflowId, applicantId, decision, relatedFailureEventId } = validationResult.data;

		// Check outcome-specific permission (org:risk_assessment — risk_manager, admin)
		const canApprove = hasPermissionOrAdmin(has, orgRole, "org:risk_assessment:approve");
		const canOverrideDenied = hasPermissionOrAdmin(has, orgRole, "org:risk_assessment:override_denied");
		const needsApprove = decision.outcome === "APPROVED" || decision.outcome === "REQUEST_MORE_INFO";
		const needsOverride = decision.outcome === "REJECTED";
		if (needsApprove && !canApprove) {
			return NextResponse.json(
				{ error: "Forbidden - Missing org:risk_assessment:approve permission" },
				{ status: 403 }
			);
		}
		if (needsOverride && !canOverrideDenied) {
			return NextResponse.json(
				{ error: "Forbidden - Missing org:risk_assessment:override_denied permission" },
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
			eventType: "human_override",
			payload: JSON.stringify({
				decision: decision.outcome,
				reason: decision.reason,
				overrideCategory: decision.overrideCategory,
				overrideSubcategory: decision.overrideSubcategory,
				overrideDetails: decision.overrideDetails,
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
			overrideCategory: decision.overrideCategory,
			overrideSubcategory: decision.overrideSubcategory,
			overrideDetails: decision.overrideDetails,
			decidedBy: userId,
			relatedFailureEventId,
		});

		if (!feedbackResult.success) {
			console.warn("[RiskDecision] Failed to record feedback log:", feedbackResult.error);
		}

		if (decision.reason && decision.reason.trim().length > 0) {
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
				const category = decision.overrideCategory || "CONTEXT";

				await db
					.update(aiAnalysisLogs)
					.set({ humanOverrideReason: category })
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
					overrideCategory: decision.overrideCategory,
					overrideSubcategory: decision.overrideSubcategory,
					overrideDetails: decision.overrideDetails,
					conditions: decision.conditions,
					timestamp: new Date().toISOString(),
				},
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
				overrideCategory: decision.overrideCategory,
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
