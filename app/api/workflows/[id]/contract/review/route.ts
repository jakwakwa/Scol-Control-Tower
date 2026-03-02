import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";

const ContractReviewSchema = z.object({
	applicantId: z.number().int().positive(),
	reviewNotes: z.string().max(2000).optional(),
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
		const parsed = ContractReviewSchema.safeParse(payload);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const { applicantId, reviewNotes } = parsed.data;
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

		await db.insert(workflowEvents).values({
			workflowId,
			eventType: "contract_draft_reviewed",
			payload: JSON.stringify({
				reviewedBy: userId,
				reviewNotes,
				timestamp: new Date().toISOString(),
			}),
			actorType: "user",
			actorId: userId,
		});

		await inngest.send({
			name: "contract/draft.reviewed",
			data: {
				workflowId,
				applicantId,
				reviewedBy: userId,
				reviewedAt: new Date().toISOString(),
				changes: reviewNotes ? { reviewNotes } : undefined,
			},
		});

		return NextResponse.json({
			success: true,
			workflowId,
			applicantId,
			message: "Contract draft review recorded",
		});
	} catch (error) {
		console.error("[ContractReviewAction] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
