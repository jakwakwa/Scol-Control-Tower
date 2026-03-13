/**
 * Two-Factor Final Approval API — SOP Stage 6
 *
 * Handles individual approval submissions from Risk Manager and Account Manager.
 * The workflow only completes when BOTH have approved (tracked on the workflow record).
 *
 * POST /api/onboarding/approve
 * Body: { workflowId, applicantId, role: "risk_manager" | "account_manager", decision, reason? }
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { workflows, workflowEvents, applicants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { hasPermissionOrAdmin } from "@/lib/auth/permissions";
import { acquireStateLock } from "@/lib/services/state-lock.service";
import { recordFinalApprovalDecision } from "@/lib/services/workflow-command.service";

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
		const { userId, has, orgRole } = await auth();
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

		// Role-specific permission: risk_manager → risk_assessment, account_manager → quote (admin bypasses)
		if (role === "risk_manager") {
			const canApprove = hasPermissionOrAdmin(has, orgRole, "org:risk_assessment:approve");
			const canOverride = hasPermissionOrAdmin(has, orgRole, "org:risk_assessment:override_denied");
			if (decision === "APPROVED" && !canApprove) {
				return NextResponse.json(
					{ error: "Forbidden - Missing org:risk_assessment:approve permission" },
					{ status: 403 }
				);
			}
			if (decision === "REJECTED" && !canOverride) {
				return NextResponse.json(
					{ error: "Forbidden - Missing org:risk_assessment:override_denied permission" },
					{ status: 403 }
				);
			}
		} else {
			if (!hasPermissionOrAdmin(has, orgRole, "org:quote:approve")) {
				return NextResponse.json(
					{ error: "Forbidden - Missing org:quote:approve permission" },
					{ status: 403 }
				);
			}
		}

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

		const timestamp = new Date().toISOString();
		const approvalState = await recordFinalApprovalDecision({
			workflowId,
			role,
			decision,
			reason,
			approvedBy: userId,
			timestamp,
		});

		if (!approvalState.alreadyRecorded) {
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
					timestamp,
				},
			});
		}

		return NextResponse.json({
			success: true,
			message: `${role.replace("_", " ")} ${decision.toLowerCase()} recorded`,
			workflowId,
			applicantId,
			approvedBy: userId,
			role,
			decision,
			bothApproved: approvalState.bothApproved,
			timestamp,
			alreadyRecorded: approvalState.alreadyRecorded,
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
			.where(eq(workflows.id, parseInt(workflowId, 10)));

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
