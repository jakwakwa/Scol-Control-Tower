import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes, workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest";
import { acquireStateLock } from "@/lib/services/state-lock.service";
import { requireAuth } from "@/lib/auth/api-auth";

/**
 * POST /api/quotes/[id]/approve
 * Mark quote as approved by staff and notify workflow
 */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const authResult = await requireAuth();
		if (authResult instanceof NextResponse) {
			return authResult;
		}
		const { userId } = authResult;

		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const resolvedParams = await params;
		const id = Number(resolvedParams.id);

		if (!Number.isFinite(id)) {
			return NextResponse.json({ error: "Invalid quote ID" }, { status: 400 });
		}

		const quoteResults = await db.select().from(quotes).where(eq(quotes.id, id));

		if (quoteResults.length === 0) {
			return NextResponse.json({ error: "Quote not found" }, { status: 404 });
		}

		const updatedQuoteResults = await db
			.update(quotes)
			.set({
				status: "pending_signature",
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
				{ error: "Applicant ID missing for quote approval" },
				{ status: 400 }
			);
		}

		await acquireStateLock(updatedQuote.workflowId, userId);

		await inngest.send({
			name: "quote/approved",
			data: {
				workflowId: updatedQuote.workflowId,
				applicantId,
				quoteId: updatedQuote.id,
				approvedAt: new Date().toISOString(),
			},
		});

		return NextResponse.json({ quote: updatedQuote });
	} catch (error) {
		console.error("Error approving quote:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
