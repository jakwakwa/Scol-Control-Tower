import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants, workflows } from "@/db/schema";
import { inngest } from "@/inngest";
import { z } from "zod";

// Schema for incoming Google Form data
const applicantCaptureSchema = z.object({
	companyName: z.string().min(1, "Company name is required"),
	contactName: z.string().min(1, "Contact name is required"),
	email: z.string().email("Invalid email address"),
	phone: z.string().optional(),
	industry: z.string().optional(),
	employeeCount: z.coerce.number().optional(),
	estimatedTransactionsPerMonth: z.coerce.number().int().min(0).optional(),
	secret: z.string().min(1, "Secret is required"), // Shared secret for auth
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// 1. Validation
		const validation = applicantCaptureSchema.safeParse(body);
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

		// 2. Auth Check (Simple Shared Secret)
		const expectedSecret =
			process.env.GAS_WEBHOOK_SECRET || process.env.CRON_SECRET || "temp_dev_secret";
		if (data.secret !== expectedSecret) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = await getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		// 3. Create Applicant
		// Returning * is supported in Postgres/SQLite via Drizzle
		const [newApplicant] = await db
			.insert(applicants)
			.values([
				{
					companyName: data.companyName,
					contactName: data.contactName,
					email: data.email,
					phone: data.phone,
					industry: data.industry,
					employeeCount: data.employeeCount,
					estimatedTransactionsPerMonth:
						data.estimatedTransactionsPerMonth != null
							? Math.round(Number(data.estimatedTransactionsPerMonth))
							: null,
					status: "new",
				},
			])
			.returning();

		if (!newApplicant) {
			throw new Error("Failed to create applicant record");
		}

		// 4. Create Workflow
		const [newWorkflow] = await db
			.insert(workflows)
			.values([
				{
					applicantId: newApplicant.id,
					stage: 1,
					status: "pending",
				},
			])
			.returning();

		if (!newWorkflow) {
			throw new Error("Failed to create workflow record");
		}

		// 5. Trigger Control Tower workflow
		await inngest.send({
			name: "onboarding/lead.created",
			data: {
				applicantId: newApplicant.id,
				workflowId: newWorkflow.id,
			},
		});

		return NextResponse.json(
			{
				success: true,
				applicantId: newApplicant.id,
				workflowId: newWorkflow.id,
				message: "Applicant captured and workflow started",
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error in applicant-capture webhook:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
