/**
 * Procurement Decision API - Control Tower Endpoint
 *
 * Allows the Risk Manager to clear or deny an applicant based on
 * procurement check results. Sends 'risk/procurement.completed' event
 * to resume the V2 workflow.
 *
 * V2: Captures structured override data for AI retraining pipeline.
 *
 * CRITICAL: When procurement is DENIED, this triggers the kill switch
 * to immediately halt all parallel processes.
 *
 * POST /api/risk-decision/procurement
 * Body: { workflowId, applicantId, procureCheckResult, decision }
 */

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { OVERRIDE_CATEGORIES } from "@/lib/constants/override-taxonomy";
import { recordFeedbackLog } from "@/lib/services/divergence.service";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";

// ============================================
// Request Schema
// ============================================

const ProcurementDecisionSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	procureCheckResult: z.object({
		riskScore: z.number().min(0).max(100),
		anomalies: z.array(z.string()),
		recommendedAction: z.enum(["APPROVE", "MANUAL_REVIEW", "DECLINE"]),
		rawData: z.record(z.string(), z.unknown()).optional(),
	}),
	decision: z.object({
		outcome: z.enum(["CLEARED", "DENIED"]),
		/** Structured override category — maps to AI failure taxonomy */
		overrideCategory: z.enum(OVERRIDE_CATEGORIES),
		overrideSubcategory: z.string().optional(),
		overrideDetails: z.string().max(500).optional(),
	}),
});

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
		const validationResult = ProcurementDecisionSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { workflowId, applicantId, procureCheckResult, decision } =
			validationResult.data;

		// Verify workflow exists
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

		// Log the decision event to the database (legacy event log)
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "procurement_decision",
			payload: JSON.stringify({
				decision: decision.outcome,
				overrideCategory: decision.overrideCategory,
				overrideSubcategory: decision.overrideSubcategory,
				overrideDetails: decision.overrideDetails,
				riskScore: procureCheckResult.riskScore,
				anomalies: procureCheckResult.anomalies,
				fromStage: workflow.stage,
			}),
			actorId: userId,
			actorType: "user",
		});

		// Record structured feedback log for AI retraining pipeline
		const feedbackResult = await recordFeedbackLog({
			workflowId,
			applicantId,
			humanOutcome: decision.outcome === "CLEARED" ? "APPROVED" : "REJECTED",
			overrideCategory: decision.overrideCategory,
			overrideSubcategory: decision.overrideSubcategory,
			overrideDetails: decision.overrideDetails,
			decidedBy: userId,
		});

		if (!feedbackResult.success) {
			console.warn(
				"[ProcurementDecision] Failed to record feedback log:",
				feedbackResult.error
			);
		}

		// CRITICAL: If procurement is DENIED, trigger kill switch
		if (decision.outcome === "DENIED") {
			const killSwitchResult = await executeKillSwitch({
				workflowId,
				applicantId,
				reason: "PROCUREMENT_DENIED",
				decidedBy: userId,
				notes: decision.overrideDetails || "Procurement check denied by Risk Manager",
			});

			if (!killSwitchResult.success) {
				console.error(
					"[ProcurementDecision] Kill switch execution failed:",
					killSwitchResult.error
				);
			}
		}

		// Send the event to Inngest to resume/terminate the workflow
		await inngest.send({
			name: "risk/procurement.completed",
			data: {
				workflowId,
				applicantId,
				procureCheckResult: {
					riskScore: procureCheckResult.riskScore,
					anomalies: procureCheckResult.anomalies,
					recommendedAction: procureCheckResult.recommendedAction,
					rawData: procureCheckResult.rawData,
				},
				decision: {
					outcome: decision.outcome,
					decidedBy: userId,
					overrideCategory: decision.overrideCategory,
					overrideSubcategory: decision.overrideSubcategory,
					overrideDetails: decision.overrideDetails,
					timestamp: new Date().toISOString(),
				},
			},
		});

		// Return success response
		return NextResponse.json({
			success: true,
			message: `Procurement decision recorded: ${decision.outcome}`,
			workflowId,
			applicantId,
			decision: {
				outcome: decision.outcome,
				decidedBy: userId,
				timestamp: new Date().toISOString(),
			},
			killSwitchActivated: decision.outcome === "DENIED",
		});
	} catch (error) {
		console.error("[ProcurementDecision] Error processing decision:", error);

		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
