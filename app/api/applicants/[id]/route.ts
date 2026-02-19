import { and, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import {
	applicantMagiclinkForms,
	applicantSubmissions,
	applicants,
	documents,
	quotes,
	riskAssessments,
	workflowEvents,
	workflows,
} from "@/db/schema";
import { updateApplicantSchema } from "@/lib/validations";

/**
 * PUT /api/applicants/[id]
 * Update an applicant by ID
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// Await params in Next.js 15
		const resolvedParams = await params;
		const id = parseInt(resolvedParams.id);

		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const body = await request.json();

		const validation = updateApplicantSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const data = validation.data;

		// Perform update
		const updatedApplicantResults = await db
			.update(applicants)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(applicants.id, id))
			.returning();

		if (updatedApplicantResults.length === 0) {
			return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
		}

		const updatedApplicant = updatedApplicantResults[0];

		return NextResponse.json({ applicant: updatedApplicant });
	} catch (error) {
		console.error("Error updating applicant:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * GET /api/applicants/[id]
 * Fetch applicant with documents and form submissions
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const resolvedParams = await params;
		const id = parseInt(resolvedParams.id);

		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const applicantResults = await db
			.select()
			.from(applicants)
			.where(eq(applicants.id, id));
		const applicant = applicantResults[0];

		if (!applicant) {
			return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
		}

		const [applicantDocuments, submissions, instances, riskAssessmentRows, workflowRows] =
			await Promise.all([
				db.select().from(documents).where(eq(documents.applicantId, id)),
				db
					.select()
					.from(applicantSubmissions)
					.where(eq(applicantSubmissions.applicantId, id)),
				db
					.select()
					.from(applicantMagiclinkForms)
					.where(eq(applicantMagiclinkForms.applicantId, id)),
				db.select().from(riskAssessments).where(eq(riskAssessments.applicantId, id)),
				db
					.select()
					.from(workflows)
					.where(eq(workflows.applicantId, id))
					.orderBy(desc(workflows.startedAt)),
			]);

		// Fetch quote for the most recent workflow if exists
		let quote = null;
		let sanctionsCheck: {
			source: string;
			reused: boolean;
			checkedAt: string | null;
			riskLevel: string | null;
			isBlocked: boolean | null;
		} | null = null;
		if (workflowRows.length > 0) {
			const latestWorkflow = workflowRows[0];
			const quoteRows = await db
				.select()
				.from(quotes)
				.where(eq(quotes.workflowId, latestWorkflow.id))
				.orderBy(desc(quotes.createdAt))
				.limit(1);
			quote = quoteRows[0] || null;

			const sanctionsRows = await db
				.select()
				.from(workflowEvents)
				.where(
					and(
						eq(workflowEvents.workflowId, latestWorkflow.id),
						eq(workflowEvents.eventType, "sanctions_completed")
					)
				)
				.orderBy(desc(workflowEvents.timestamp))
				.limit(1);

			const latestSanctions = sanctionsRows[0];
			if (latestSanctions) {
				let payload: Record<string, unknown> | null = null;
				if (latestSanctions.payload) {
					try {
						payload = JSON.parse(latestSanctions.payload) as Record<string, unknown>;
					} catch {
						payload = null;
					}
				}

				sanctionsCheck = {
					source:
						typeof payload?.source === "string"
							? payload.source
							: typeof payload?.reusedFrom === "string"
								? payload.reusedFrom
								: "unknown",
					reused: Boolean(payload?.reused),
					checkedAt:
						typeof payload?.checkedAt === "string"
							? payload.checkedAt
							: latestSanctions.timestamp
								? new Date(latestSanctions.timestamp).toISOString()
								: null,
					riskLevel: typeof payload?.riskLevel === "string" ? payload.riskLevel : null,
					isBlocked: typeof payload?.isBlocked === "boolean" ? payload.isBlocked : null,
				};
			}
		}

		return NextResponse.json({
			applicant,
			documents: applicantDocuments,
			applicantSubmissions: submissions,
			applicantMagiclinkForms: instances,
			riskAssessment: riskAssessmentRows[0] || null,
			workflow: workflowRows[0] || null,
			quote,
			sanctionsCheck,
		});
	} catch (error) {
		console.error("Error fetching applicant:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
