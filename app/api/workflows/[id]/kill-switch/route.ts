/**
 * Kill Switch API Endpoint
 *
 * Allows Risk Managers to immediately terminate a workflow,
 * halting all parallel processes within 60 seconds.
 *
 * POST /api/workflows/[id]/kill-switch
 * Body: { reason, notes? }
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
	executeKillSwitch,
	type KillSwitchReason,
} from "@/lib/services/kill-switch.service";

// ============================================
// Request Schema
// ============================================

const KillSwitchRequestSchema = z.object({
	reason: z.enum([
		"PROCUREMENT_DENIED",
		"COMPLIANCE_VIOLATION",
		"FRAUD_DETECTED",
		"MANUAL_TERMINATION",
	]),
	notes: z.string().optional(),
});

// ============================================
// POST Handler
// ============================================

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// Authenticate
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized - Authentication required" },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const workflowId = Number.parseInt(id, 10);

		if (Number.isNaN(workflowId)) {
			return NextResponse.json(
				{ error: "Invalid workflow ID" },
				{ status: 400 }
			);
		}

		// Parse request body
		const body = await request.json();
		const validation = KillSwitchRequestSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { reason, notes } = validation.data;

		// Verify workflow exists and get applicant ID
		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 }
			);
		}

		const [workflow] = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId));

		if (!workflow) {
			return NextResponse.json(
				{ error: `Workflow ${workflowId} not found` },
				{ status: 404 }
			);
		}

		// Check if already terminated
		if (workflow.status === "terminated") {
			return NextResponse.json(
				{ error: "Workflow is already terminated" },
				{ status: 400 }
			);
		}

		// Execute kill switch
		const result = await executeKillSwitch({
			workflowId,
			applicantId: workflow.applicantId,
			reason: reason as KillSwitchReason,
			decidedBy: userId,
			notes,
		});

		if (!result.success) {
			return NextResponse.json(
				{ error: "Kill switch execution failed", details: result.error },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Workflow terminated successfully",
			workflowId,
			terminatedAt: result.terminatedAt.toISOString(),
			reason: result.reason,
			affectedResources: result.affectedResources,
		});
	} catch (error) {
		console.error("[KillSwitch API] Error:", error);
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
// GET Handler - Check Kill Switch Status
// ============================================

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const workflowId = Number.parseInt(id, 10);

		if (Number.isNaN(workflowId)) {
			return NextResponse.json(
				{ error: "Invalid workflow ID" },
				{ status: 400 }
			);
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 }
			);
		}

		const [workflow] = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId));

		if (!workflow) {
			return NextResponse.json(
				{ error: `Workflow ${workflowId} not found` },
				{ status: 404 }
			);
		}

		const isTerminated = workflow.status === "terminated";
		let terminationDetails = null;

		if (isTerminated && workflow.metadata) {
			try {
				terminationDetails = JSON.parse(workflow.metadata);
			} catch {
				// Ignore parse errors
			}
		}

		return NextResponse.json({
			workflowId,
			isTerminated,
			status: workflow.status,
			terminationDetails,
		});
	} catch (error) {
		console.error("[KillSwitch API] GET Error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
