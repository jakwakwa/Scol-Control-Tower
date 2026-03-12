import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
	createWorkflowNotification,
} from "@/lib/services/notification-events.service";
import {
	logWorkflowEventOnce,
	markStage5GateOnce,
} from "@/lib/services/workflow-command.service";

const ConfirmAbsaSchema = z.object({
	applicantId: z.number().int().positive(),
	notes: z.string().max(2000).optional(),
});

/**
 * POST /api/workflows/[id]/absa/confirm
 * Manually confirm that ABSA has approved the contract.
 * Emits form/absa-6995.completed to advance Stage 5.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		const workflowId = Number.parseInt(id, 10);
		if (Number.isNaN(workflowId)) {
			return NextResponse.json({ error: "Invalid workflow ID" }, { status: 400 });
		}

		const payload = await request.json();
		const parsed = ConfirmAbsaSchema.safeParse(payload);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const { applicantId, notes } = parsed.data;
		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const [workflow] = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId));
		if (!workflow) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
		}
		if (workflow.applicantId !== applicantId) {
			return NextResponse.json({ error: "Applicant/workflow mismatch" }, { status: 409 });
		}

		const applied = await markStage5GateOnce({
			workflowId,
			gate: "absa_approval_confirmed",
			actorId: userId,
		});
		if (!applied) {
			return NextResponse.json({
				success: true,
				workflowId,
				applicantId,
				message: "ABSA approval was already confirmed",
				alreadyConfirmed: true,
			});
		}

		const confirmedAt = new Date().toISOString();
		await logWorkflowEventOnce({
			workflowId,
			eventType: "absa_approval_confirmed",
			payload: {
				confirmedBy: userId,
				notes,
				timestamp: confirmedAt,
			},
			actorType: "user",
			actorId: userId,
		});

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "success",
			title: "ABSA Approval Confirmed",
			message: "ABSA contract approval was manually confirmed. Workflow advancing.",
			actionable: false,
		});

		await inngest.send({
			name: "form/absa-6995.completed",
			data: {
				workflowId,
				applicantId,
				completedAt: confirmedAt,
			},
		});

		return NextResponse.json({
			success: true,
			workflowId,
			applicantId,
			message: "ABSA approval confirmed and workflow advanced",
			alreadyConfirmed: false,
		});
	} catch (error) {
		console.error("[AbsaConfirm] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
