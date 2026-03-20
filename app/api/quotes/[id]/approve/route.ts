import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasPermissionOrAdmin } from "@/lib/auth/permissions";
import { getDatabaseClient } from "@/app/utils";
import { quotes, workflows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest";
import { acquireStateLock } from "@/lib/services/state-lock.service";
import { captureServerEvent } from "@/lib/posthog-server";

/**
 * POST /api/quotes/[id]/approve
 * Mark quote as approved by staff and notify workflow.
 * Requires org:quote:approve (account_manager).
 */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { userId, has, orgRole } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized - Authentication required" },
				{ status: 401 }
			);
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

		await acquireStateLock(updatedQuote.workflowId, "quote_approval");

		await inngest.send({
			name: "quote/approved",
			data: {
				workflowId: updatedQuote.workflowId,
				applicantId,
				quoteId: updatedQuote.id,
				approvedAt: new Date().toISOString(),
			},
		});

		captureServerEvent({
			distinctId: userId,
			event: "quote_approved",
			properties: {
				quote_id: updatedQuote.id,
				workflow_id: updatedQuote.workflowId,
				applicant_id: applicantId,
			},
		});

		return NextResponse.json({ quote: updatedQuote });
	} catch (error) {
		console.error("Error approving quote:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
