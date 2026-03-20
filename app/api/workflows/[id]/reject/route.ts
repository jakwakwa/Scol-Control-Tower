import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { executeKillSwitch } from "@/lib/services/kill-switch.service";
import { captureServerEvent } from "@/lib/posthog-server";

const rejectWorkflowSchema = z.object({
	reason: z.string().optional(),
	actor: z.string().optional(),
});

/**
 * DELETE /api/workflows/[id]/reject
 *
 * Terminates a workflow via the kill-switch path instead of destructively
 * deleting it, preserving the audit trail for internal dashboard surfacing.
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const workflowId = parseInt(id, 10);

		if (Number.isNaN(workflowId)) {
			return NextResponse.json({ error: "Invalid workflow ID" }, { status: 400 });
		}

		const db = await getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		let body: { reason?: string; actor?: string } = {};
		try {
			body = await request.json();
			rejectWorkflowSchema.parse(body);
		} catch {
			// Body is optional
		}

		const existingWorkflow = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId))
			.limit(1);

		if (existingWorkflow.length === 0) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
		}

		const workflow = existingWorkflow[0];

		if (workflow.status === "terminated" || workflow.status === "completed") {
			return NextResponse.json(
				{ error: `Workflow is already ${workflow.status}` },
				{ status: 409 }
			);
		}

		await executeKillSwitch({
			workflowId,
			applicantId: workflow.applicantId,
			reason: "MANUAL_TERMINATION",
			decidedBy: body.actor || "admin",
			notes: body.reason || "Rejected via Control Tower",
		});

		captureServerEvent({
			distinctId: body.actor || "admin",
			event: "workflow_terminated",
			properties: {
				workflow_id: workflowId,
				applicant_id: workflow.applicantId,
				reason: body.reason || "Rejected via Control Tower",
			},
		});

		return NextResponse.json({
			success: true,
			message: "Workflow terminated",
			workflowId,
			applicantId: workflow.applicantId,
		});
	} catch (error) {
		console.error("Error rejecting workflow:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
