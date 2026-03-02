/**
 * Two-Factor Final Approval API — SOP Stage 6
 *
 * Handles individual approval submissions from Risk Manager and Account Manager.
 * The workflow only completes when BOTH have approved (tracked on the workflow record).
 *
 * POST /api/onboarding/approve
 * Body: { workflowId, applicantId, role: "risk_manager" | "account_manager", decision, reason? }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents, applicants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { acquireStateLock } from "@/lib/services/state-lock.service";

// ============================================
// Request Schema
// ============================================

const TwoFactorApprovalSchema = z.object({
	workflowId: z.number().int().positive("Workflow ID is required"),
	applicantId: z.number().int().positive("Applicant ID is required"),
	role: z.enum(["risk_manager", "account_manager"]),
	decision: z.enum(["APPROVED", "REJECTED"]),
	reason: z.string().optional(),
});

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized - Authentication required" },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const validationResult = TwoFactorApprovalSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { workflowId, applicantId, role, decision, reason } = validationResult.data;

		console.log(`[TwoFactorApproval] ${role} decision for workflow ${workflowId}:`, {
			decision,
			approvedBy: userId,
		});

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Verify workflow exists
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

		// Verify applicant exists
		const applicantResult = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, applicantId));

		if (applicantResult.length === 0) {
			return NextResponse.json(
				{ error: `Applicant ${applicantId} not found` },
				{ status: 404 }
			);
		}

		// Acquire state lock to prevent ghost processes from overwriting finalized approval
		await acquireStateLock(workflowId, userId);

		// Log the approval event
		await db.insert(workflowEvents).values({
			workflowId,
			eventType: `two_factor_approval_${role}`,
			payload: JSON.stringify({
				role,
				decision,
				reason,
				fromStage: workflow.stage,
			}),
			actorId: userId,
			actorType: "user",
		});

		// Send the appropriate Inngest event
		const eventName = role === "risk_manager"
			? "approval/risk-manager.received" as const
			: "approval/account-manager.received" as const;

		await inngest.send({
			name: eventName,
			data: {
				workflowId,
				applicantId,
				approvedBy: userId,
				decision,
				reason,
				timestamp: new Date().toISOString(),
			},
		});

		console.log(`[TwoFactorApproval] ${role} event sent for workflow ${workflowId}`);

		// Check if both approvals are now present
		const riskApproval = role === "risk_manager"
			? { approvedBy: userId, decision, timestamp: new Date().toISOString() }
			: workflow.riskManagerApproval
				? JSON.parse(workflow.riskManagerApproval)
				: null;

		const accountApproval = role === "account_manager"
			? { approvedBy: userId, decision, timestamp: new Date().toISOString() }
			: workflow.accountManagerApproval
				? JSON.parse(workflow.accountManagerApproval)
				: null;

		const bothApproved = riskApproval?.decision === "APPROVED" && accountApproval?.decision === "APPROVED";

		return NextResponse.json({
			success: true,
			message: `${role.replace("_", " ")} ${decision.toLowerCase()} recorded`,
			workflowId,
			applicantId,
			approvedBy: userId,
			role,
			decision,
			bothApproved,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[TwoFactorApproval] Error processing approval:", error);

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
// GET Handler - Get approval status
// ============================================

export async function GET(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const workflowId = searchParams.get("workflowId");

		if (!workflowId) {
			return NextResponse.json(
				{ error: "workflowId query parameter is required" },
				{ status: 400 }
			);
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const workflowResult = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, parseInt(workflowId)));

		const workflow = workflowResult[0];
		if (!workflow) {
			return NextResponse.json(
				{ error: `Workflow ${workflowId} not found` },
				{ status: 404 }
			);
		}

		const riskManagerApproval = workflow.riskManagerApproval
			? JSON.parse(workflow.riskManagerApproval)
			: null;

		const accountManagerApproval = workflow.accountManagerApproval
			? JSON.parse(workflow.accountManagerApproval)
			: null;

		const isReadyForApproval =
			workflow.status === "awaiting_human" && workflow.stage === 6;

		return NextResponse.json({
			workflowId: workflow.id,
			applicantId: workflow.applicantId,
			status: workflow.status,
			stage: workflow.stage,
			isReadyForApproval,
			riskManagerApproval,
			accountManagerApproval,
			bothApproved:
				riskManagerApproval?.decision === "APPROVED" &&
				accountManagerApproval?.decision === "APPROVED",
		});
	} catch (error) {
		console.error("[TwoFactorApproval] Error fetching status:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
