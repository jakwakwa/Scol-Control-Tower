import { auth } from "@clerk/nextjs/server";
import { hasPermissionOrAdmin } from "@/lib/auth/permissions";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { workflowEvents, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";

const FinancialStatementsConfirmSchema = z.object({
	applicantId: z.number().int().positive(),
	notes: z.string().max(2000).optional(),
});

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { userId, has, orgRole } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermissionOrAdmin(has, orgRole, "org:quote:approve")) {
			return NextResponse.json(
				{ error: "Forbidden - Missing org:quote:approve permission" },
				{ status: 403 }
			);
		}

		const { id } = await params;
		const workflowId = Number.parseInt(id, 10);
		if (Number.isNaN(workflowId)) {
			return NextResponse.json({ error: "Invalid workflow ID" }, { status: 400 });
		}

		const payload = await request.json();
		const parsed = FinancialStatementsConfirmSchema.safeParse(payload);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const { applicantId, notes } = parsed.data;
		const db = await getDatabaseClient();
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
			eventType: "financial_statements_confirmed",
			payload: JSON.stringify({
				confirmedBy: userId,
				notes,
				timestamp: new Date().toISOString(),
			}),
			actorType: "user",
			actorId: userId,
		});

		await inngest.send({
			name: "risk/financial-statements.confirmed",
			data: {
				workflowId,
				applicantId,
				confirmedBy: userId,
				confirmedAt: new Date().toISOString(),
				notes,
			},
		});

		return NextResponse.json({
			success: true,
			workflowId,
			applicantId,
			message: "Financial statements confirmation recorded",
		});
	} catch (error) {
		console.error("[FinancialStatementsConfirm] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
