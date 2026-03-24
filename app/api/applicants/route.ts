import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflows } from "@/db/schema";
import { createApplicantSchema } from "@/lib/validations";
import { inngest } from "@/inngest";
import { requireAuth } from "@/lib/auth/api-auth";
import { captureServerEvent } from "@/lib/posthog-server";

/**
 * GET /api/applicants
 * List all applicants with optional pagination
 */
export async function GET() {
	try {
		const authResult = await requireAuth();
		if (authResult instanceof NextResponse) {
			return authResult;
		}

		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const allApplicants = await db
			.select()
			.from(applicants)
			.orderBy(applicants.createdAt);

		return NextResponse.json({ applicants: allApplicants });
	} catch (error) {
		console.error("Error fetching applicants:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * POST /api/applicants
 * Create a new applicant and start the onboarding workflow
 */
export async function POST(request: NextRequest) {
	try {
		const authResult = await requireAuth();
		if (authResult instanceof NextResponse) {
			return authResult;
		}

		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const body = await request.json();

		// Validate input with Zod
		const validation = createApplicantSchema.safeParse(body);

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

		// Insert the new applicant
		const newApplicantResults = await db
			.insert(applicants)
			.values([
				{
					companyName: data.companyName,
					contactName: data.contactName,
					email: data.email,
					phone: data.phone,
					vatNumber: data.vatNumber?.trim() || null,
					idNumber: data.idNumber || null,
					entityType: data.entityType,
					productType: data.productType,
					industry: data.industry,
					employeeCount: data.employeeCount,
					estimatedTransactionsPerMonth:
						data.estimatedTransactionsPerMonth != null
							? Math.round(Number(data.estimatedTransactionsPerMonth))
							: null,
					notes: data.notes,
					status: "new",
				},
			])
			.returning();

		const newApplicant = newApplicantResults[0];

		if (!newApplicant) {
			throw new Error("Failed to create applicant record in database");
		}

		// Create the initial Workflow record in DB
		const [newWorkflow] = await db
			.insert(workflows)
			.values([
				{
					applicantId: newApplicant.id,
					stage: 1,
					status: "pending",
					// Removed fields not in schema: stageName, currentAgent
				},
			])
			.returning();

		if (!newWorkflow) {
			throw new Error("Failed to create workflow record");
		}

		// Start the Control Tower workflow with enriched payload
		try {
			await inngest.send({
				name: "onboarding/lead.created",
				data: { 
					applicantId: newApplicant.id, 
					workflowId: newWorkflow.id,
					companyName: newApplicant.companyName,
					contactName: newApplicant.contactName,
					email: newApplicant.email,
					source: "dashboard",
					createdAt: new Date().toISOString(),
				},
			});
		} catch (inngestError) {
			console.error("[API] Failed to start Inngest workflow:", inngestError);
		}

		captureServerEvent({
			distinctId: authResult.userId,
			event: "applicant_created",
			properties: {
				applicant_id: newApplicant.id,
				workflow_id: newWorkflow.id,
				company_name: newApplicant.companyName,
				entity_type: newApplicant.entityType,
				product_type: newApplicant.productType,
				industry: newApplicant.industry,
			},
		});

		return NextResponse.json(
			{ applicant: newApplicant, workflow: newWorkflow },
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating applicant:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
