/**
 * Manual Green Lane API — AM-triggered Stage 4 bypass
 *
 * Allows the Account Manager to grant Green Lane on the applicant detail page
 * once the signed quote prerequisite exists. Uses the same durable bypass path
 * as automatic Green Lane. Suppresses Stage 4 review comms.
 *
 * POST /api/workflows/[id]/green-lane
 * Body: { applicantId: number, notes?: string }
 */

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getBaseUrl, getDatabaseClient } from "@/app/utils";
import { applicants, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
	hasSignedQuotePrerequisite,
	requestManualGreenLane,
} from "@/lib/services/green-lane.service";
import { createWorkflowNotification } from "@/lib/services/notification-events.service";
import { sendInternalAlertEmail } from "@/lib/services/email.service";
import { acquireStateLock } from "@/lib/services/state-lock.service";

const GreenLaneRequestSchema = z.object({
	applicantId: z.number().int().positive("Applicant ID is required"),
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

		const body = await request.json();
		const parsed = GreenLaneRequestSchema.safeParse(body);
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
			return NextResponse.json(
				{ error: "Applicant/workflow mismatch" },
				{ status: 409 }
			);
		}

		const hasSignedQuote = await hasSignedQuotePrerequisite(workflowId);
		if (!hasSignedQuote) {
			return NextResponse.json(
				{
					error: "Signed quote prerequisite not met",
					message: "Green Lane is only available after the quote has been signed.",
				},
				{ status: 400 }
			);
		}

		const [applicant] = await db
			.select({ riskLevel: applicants.riskLevel })
			.from(applicants)
			.where(eq(applicants.id, applicantId))
			.limit(1);

		if (!applicant) {
			return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
		}

		if (applicant.riskLevel === "red") {
			return NextResponse.json(
				{
					error: "High-risk applicants must complete financial statements review",
					message: "Manual Green Lane is not available for high-risk workflows.",
				},
				{ status: 400 }
			);
		}

		await acquireStateLock(workflowId, userId);

		const result = await requestManualGreenLane(workflowId, applicantId, userId, notes);

		if (!result.success) {
			if (result.alreadyRequested || result.alreadyConsumed) {
				return NextResponse.json(
					{ error: result.error, alreadyRequested: result.alreadyRequested, alreadyConsumed: result.alreadyConsumed },
					{ status: 409 }
				);
			}
			return NextResponse.json(
				{ error: result.error ?? "Failed to request Green Lane" },
				{ status: 500 }
			);
		}

		await createWorkflowNotification({
			workflowId,
			applicantId,
			type: "success",
			title: "Green Lane Granted Manually",
			message: `Account Manager granted Green Lane. Stage 4 review will be bypassed.${notes ? ` Notes: ${notes}` : ""}`,
			actionable: false,
		});

		await sendInternalAlertEmail({
			title: "Green Lane Granted Manually",
			message: `Account Manager granted Green Lane for workflow ${workflowId}. Stage 4 review will be bypassed.${notes ? `\nNotes: ${notes}` : ""}`,
			workflowId,
			applicantId,
			type: "success",
			actionUrl: `${getBaseUrl()}/dashboard/applicants/${applicantId}?tab=risk`,
		});

		// If Stage 4 is already awaiting human review, emit resume event so Inngest consumes the manual grant
		if (workflow.status === "awaiting_human" && workflow.stage === 4) {
			await inngest.send({
				name: "risk/decision.received",
				data: {
					workflowId,
					applicantId,
					decision: {
						outcome: "APPROVED" as const,
						decidedBy: userId,
						reason: "Manual Green Lane",
						source: "manual_green_lane" as const,
						timestamp: new Date().toISOString(),
					},
				},
			});
		}

		return NextResponse.json({
			success: true,
			workflowId,
			applicantId,
			message: "Green Lane granted manually",
		});
	} catch (error) {
		console.error("[GreenLane] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
