/**
 * Dev-only API route to generate magic link tokens for form testing.
 *
 * POST /api/dev/forms/generate-token
 * Body: { formType: FormType }
 *
 * Returns: { token, url }
 *
 * ⚠️ Only available when NODE_ENV !== "production"
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { applicants } from "@/db/schema";
import { createFormInstance } from "@/lib/services/form.service";
import { FormTypeSchema } from "@/lib/types";

/**
 * Find an existing applicant or create a dev test applicant.
 * Returns the applicant ID.
 */
async function getOrCreateDevApplicant(): Promise<number> {
	const db = getDatabaseClient();
	if (!db) throw new Error("Database connection failed");

	// Try to find any existing applicant
	const existing = await db.select({ id: applicants.id }).from(applicants).limit(1);
	if (existing.length > 0) {
		return existing[0].id;
	}

	// No applicants exist — create a dev test applicant
	const [created] = await db
		.insert(applicants)
		.values({
			companyName: "Dev Test Company (Pty) Ltd",
			tradingName: "Dev Test Co",
			registrationNumber: "2024/999999/07",
			entityType: "company",
			businessType: "COMPANY",
			contactName: "Dev Tester",
			email: "dev@test.local",
			phone: "0000000000",
			status: "PENDING",
		})
		.returning({ id: applicants.id });

	if (!created) throw new Error("Failed to create dev applicant");
	return created.id;
}

export async function POST(request: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Not available in production" }, { status: 403 });
	}

	try {
		const body = await request.json();
		const formTypeResult = FormTypeSchema.safeParse(body.formType);

		if (!formTypeResult.success) {
			return NextResponse.json(
				{ error: "Invalid form type", validTypes: FormTypeSchema.options },
				{ status: 400 }
			);
		}

		const formType = formTypeResult.data;

		// Get or create a dev applicant
		const applicantId = await getOrCreateDevApplicant();

		const { token } = await createFormInstance({
			applicantId,
			workflowId: null,
			formType,
			expiresInDays: 30,
		});

		// Determine the correct URL path based on form type
		let basePath: string;
		if (formType === "STRATCOL_CONTRACT") {
			basePath = "/contract";
		} else if (formType === "DOCUMENT_UPLOADS") {
			basePath = "/uploads";
		} else {
			basePath = "/forms";
		}

		const url = `${basePath}/${token}`;

		return NextResponse.json({
			success: true,
			formType,
			token,
			url,
			applicantId,
		});
	} catch (error) {
		console.error("[DevForms] Error generating token:", error);
		return NextResponse.json(
			{
				error: "Failed to generate token",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
