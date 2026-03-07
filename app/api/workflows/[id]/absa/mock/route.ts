import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";

const MockAbsaSchema = z.object({
	applicantId: z.number().int().positive(),
	notes: z.string().max(2000).optional(),
});

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
		const parsed = MockAbsaSchema.safeParse(payload);
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

		await logWorkflowEvent({
			workflowId,
			eventType: "absa_form_completed",
			payload: {
				mode: "mock",
				mockedBy: userId,
				notes,
				timestamp: new Date().toISOString(),
			},
			actorType: "user",
			actorId: userId,
		});

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "info",
			title: "ABSA Handoff Mocked",
			message: "ABSA form handoff was manually marked as completed for this workflow.",
			actionable: false,
		});

		await inngest.send({
			name: "form/absa-6995.completed",
			data: {
				workflowId,
				applicantId,
				completedAt: new Date().toISOString(),
			},
		});

		return NextResponse.json({
			success: true,
			workflowId,
			applicantId,
			message: "ABSA handoff mocked and completion signal emitted",
		});
	} catch (error) {
		console.error("[MockABSA] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
