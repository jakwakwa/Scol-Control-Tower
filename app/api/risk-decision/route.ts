/**
 * Risk Decision API - Control Tower Endpoint
 *
 * Allows the Risk Manager to approve/reject a client application.
 * Sends the 'risk/decision.received' event to Inngest to resume the Saga.
 *
 * POST /api/risk-decision
 * Body: { workflowId, applicantId, decision: { outcome, reason?, conditions? } }
 */

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { aiAnalysisLogs, workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";

// ============================================
// Request Schema
// ============================================

const RiskDecisionSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	decision: z.object({
		outcome: z.enum(["APPROVED", "REJECTED", "REQUEST_MORE_INFO"]),
		reason: z.string().optional(),
		overrideCategory: z.enum(["CONTEXT", "HALLUCINATION", "DATA_ERROR"]).optional(),
		conditions: z.array(z.string()).optional(),
	}),
});

type RiskDecisionInput = z.infer<typeof RiskDecisionSchema>;

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
	try {
		// Authenticate the request
		const { userId } = await auth();
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

		const { workflowId, applicantId, decision } = validationResult.data;

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

		// Log the decision event to the database
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "human_override",
			payload: JSON.stringify({
				decision: decision.outcome,
				reason: decision.reason,
				overrideCategory: decision.overrideCategory,
				conditions: decision.conditions,
				fromStage: workflow.stage,
				toStage: workflow.stage, // No stage change implied yet
			}),
			actorId: userId,
			actorType: "user",
		});

		// Task 4: Log Human Override if reason provided
		if (decision.reason && decision.reason.trim().length > 0) {
			// Find the latest Reporter Agent analysis for this workflow
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
					.set({
						humanOverrideReason: category,
						// Append the specific reason to the narrative or rely on a new column in future
						// For now, we are satisfying the requirement to log the override.
						// We could also consider updating rawOutput to include the reason.
					})
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
					reason: decision.reason,
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
				decidedBy: userId,
				timestamp: new Date().toISOString(),
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
