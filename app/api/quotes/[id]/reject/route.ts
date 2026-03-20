import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes, workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest";
import { auth } from "@clerk/nextjs/server";
import { hasPermissionOrAdmin } from "@/lib/auth/permissions";
import { z } from "zod";
import { acquireStateLock } from "@/lib/services/state-lock.service";
import { captureServerEvent } from "@/lib/posthog-server";

const RejectQuoteSchema = z.object({
	reason: z.string().min(1, "Reason is required"),
	isOverlimit: z.boolean().default(false),
});

/**
 * POST /api/quotes/[id]/reject
 * Reject a quote and notify workflow
 */
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

		const db = await getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const resolvedParams = await params;
		const id = Number(resolvedParams.id);

		if (!Number.isFinite(id)) {
			return NextResponse.json({ error: "Invalid quote ID" }, { status: 400 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validationResult = RejectQuoteSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { reason, isOverlimit } = validationResult.data;

		// Get the quote
		const quoteResults = await db.select().from(quotes).where(eq(quotes.id, id));

		if (quoteResults.length === 0) {
			return NextResponse.json({ error: "Quote not found" }, { status: 404 });
		}

		// Update quote status
		const updatedQuoteResults = await db
			.update(quotes)
			.set({
				status: "rejected",
				updatedAt: new Date(),
			})
			.where(eq(quotes.id, id))
			.returning();

		const updatedQuote = updatedQuoteResults[0];
		let applicantId = updatedQuote.applicantId ?? null;

		if (!applicantId) {
			const workflowResults = await db
				.select()
				.from(workflows)
				.where(eq(workflows.id, updatedQuote.workflowId));
			applicantId = workflowResults[0]?.applicantId ?? null;
		}

		if (!applicantId) {
			return NextResponse.json(
				{ error: "Applicant ID missing for quote rejection" },
				{ status: 400 }
			);
		}

		await acquireStateLock(updatedQuote.workflowId, userId);

		// Send rejection event to Inngest
		await inngest.send({
			name: "quote/rejected",
			data: {
				workflowId: updatedQuote.workflowId,
				applicantId,
				quoteId: updatedQuote.id,
				reason,
				isOverlimit,
				rejectedBy: userId,
				rejectedAt: new Date().toISOString(),
			},
		});

		captureServerEvent({
			distinctId: userId,
			event: "quote_rejected",
			properties: {
				quote_id: updatedQuote.id,
				workflow_id: updatedQuote.workflowId,
				applicant_id: applicantId,
				reason,
				is_overlimit: isOverlimit,
			},
		});

		return NextResponse.json({
			success: true,
			quote: updatedQuote,
			message: isOverlimit
				? "Quote rejected due to overlimit"
				: "Quote rejected",
		});
	} catch (error) {
		console.error("Error rejecting quote:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
