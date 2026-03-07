import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { internalForms, internalSubmissions, workflows, FORM_TYPES } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/inngest/client";

/**
 * GET /api/onboarding/forms/[workflowId]/[formType]
 * Get form data for a specific workflow and form type
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string; formType: string }> }
) {
	const { workflowId, formType } = await params;

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	// Validate form type
	if (!FORM_TYPES.includes(formType as any)) {
		return NextResponse.json({ error: "Invalid form type" }, { status: 400 });
	}

	try {
		// Get or create the internal form record
		const existingForm = await db
			.select()
			.from(internalForms)
			.where(
				and(
					eq(internalForms.workflowId, parseInt(workflowId)),
					eq(internalForms.formType, formType as any)
				)
			)
			.limit(1);

		const form = existingForm[0];
		if (!form) {
			// Return empty form data with not_started status
			return NextResponse.json({
				form: null,
				submission: null,
				status: "not_started",
			});
		}

		// Get the latest submission
		const latestSubmission = await db
			.select()
			.from(internalSubmissions)
			.where(eq(internalSubmissions.internalFormId, form.id))
			.orderBy(internalSubmissions.version)
			.limit(1);

		return NextResponse.json({
			form,
			submission: latestSubmission[0] || null,
			status: form.status,
		});
	} catch (error) {
		console.error("Failed to fetch form:", error);
		return NextResponse.json({ error: "Failed to fetch form data" }, { status: 500 });
	}
}

/**
 * POST /api/onboarding/forms/[workflowId]/[formType]
 * Save form data (draft or submit)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string; formType: string }> }
) {
	const { workflowId, formType } = await params;

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	// Validate form type
	if (!FORM_TYPES.includes(formType as any)) {
		return NextResponse.json({ error: "Invalid form type" }, { status: 400 });
	}

	try {
		const body = await request.json();
		const { formData, isDraft = true, userId } = body;

		if (!formData) {
			return NextResponse.json({ error: "Form data is required" }, { status: 400 });
		}

		const workflowIdNum = parseInt(workflowId);

		// Verify workflow exists
		const workflow = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowIdNum))
			.limit(1);

		if (workflow.length === 0) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
		}

		// Get or create internal form record
		let existingForm = await db
			.select()
			.from(internalForms)
			.where(
				and(
					eq(internalForms.workflowId, workflowIdNum),
					eq(internalForms.formType, formType as any)
				)
			)
			.limit(1);

		let formId: number;
		const existingFormRecord = existingForm[0];

		if (!existingFormRecord) {
			// Create new form record
			const newFormResult = await db
				.insert(internalForms)
				.values({
					workflowId: workflowIdNum,
					formType: formType as any,
					status: isDraft ? "in_progress" : "submitted",
					currentStep: body.currentStep || 1,
					totalSteps: body.totalSteps || 1,
					lastSavedAt: new Date(),
					submittedAt: isDraft ? undefined : new Date(),
				})
				.returning();

			const newForm = newFormResult[0];
			if (!newForm) {
				return NextResponse.json(
					{ error: "Failed to create form record" },
					{ status: 500 }
				);
			}
			formId = newForm.id;
		} else {
			formId = existingFormRecord.id;

			// Update form status
			await db
				.update(internalForms)
				.set({
					status: isDraft ? "in_progress" : "submitted",
					currentStep: body.currentStep || existingFormRecord.currentStep,
					lastSavedAt: new Date(),
					submittedAt: isDraft ? existingFormRecord.submittedAt : new Date(),
					updatedAt: new Date(),
				})
				.where(eq(internalForms.id, formId));
		}

		// Get current version number
		const existingSubmissions = await db
			.select()
			.from(internalSubmissions)
			.where(eq(internalSubmissions.internalFormId, formId))
			.orderBy(internalSubmissions.version);

		const lastSubmission = existingSubmissions[existingSubmissions.length - 1];
		const nextVersion = lastSubmission ? lastSubmission.version + 1 : 1;

		// Create submission record
		const submissionResult = await db
			.insert(internalSubmissions)
			.values({
				internalFormId: formId,
				version: nextVersion,
				formData: JSON.stringify(formData),
				isDraft,
				submittedBy: userId,
			})
			.returning();

		const submission = submissionResult[0];
		if (!submission) {
			return NextResponse.json(
				{ error: "Failed to create submission record" },
				{ status: 500 }
			);
		}

		// If not a draft, send Inngest event
		if (!isDraft) {
			await inngest.send({
				name: "onboarding/form-submitted",
				data: {
					workflowId: workflowIdNum,
					formType: formType as any,
					submissionId: submission.id,
				},
			});

			// For facility_application, also send the specific event for V2 workflow
			if (formType === "facility_application") {
				// Extract mandate info from form data
				const toNumber = (value: unknown): number => {
					if (typeof value === "number") return Number.isFinite(value) ? value : 0;
					if (typeof value === "string") {
						const parsed = Number(value.replace(/[R,\s]/g, ""));
						return Number.isFinite(parsed) ? parsed : 0;
					}
					return 0;
				};
				const nestedMaxRandValue =
					formData.volumeMetrics?.limitsAppliedFor?.maxRandValue ??
					formData.maxRandValue ??
					formData.max_rand_value;
				const mandateVolume =
					formData.mandateVolume ??
					formData.mandate_volume ??
					toNumber(nestedMaxRandValue) * 100;
				const serviceTypes = Array.isArray(formData.facilitySelection?.serviceTypes)
					? formData.facilitySelection.serviceTypes
					: Array.isArray(formData.serviceTypes)
						? formData.serviceTypes
						: [];
				const hasDebicheck = serviceTypes.includes("DebiCheck");
				const hasEft = serviceTypes.some((type: string) => type !== "DebiCheck");
				const derivedMandateType =
					hasDebicheck && hasEft ? "MIXED" : hasDebicheck ? "DEBIT_ORDER" : "EFT";
				const mandateType =
					formData.mandateType ?? formData.mandate_type ?? derivedMandateType;
				const businessType = formData.businessType ?? formData.business_type ?? "Unknown";
				const annualTurnover =
					formData.annualTurnover ??
					formData.annual_turnover ??
					toNumber(
						formData.volumeMetrics?.predictedGrowth?.forecastVolume ??
							formData.forecastVolume
					) *
						toNumber(
							formData.volumeMetrics?.predictedGrowth?.forecastAverageValue ??
								formData.forecastAverageValue
						) *
						12;
				const registrationOrIdNumber = formData.applicantDetails?.registrationOrIdNumber;

				await inngest.send({
					name: "form/facility.submitted",
					data: {
						workflowId: workflowIdNum,
						applicantId: workflow[0].applicantId,
						submissionId: submission.id,
						formData: {
							mandateVolume: typeof mandateVolume === "number" ? mandateVolume : parseInt(mandateVolume) || 0,
							mandateType: mandateType as "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED",
							businessType: String(businessType),
							annualTurnover: annualTurnover ? (typeof annualTurnover === "number" ? annualTurnover : parseInt(annualTurnover)) : undefined,
							facilityApplicationData: formData as Record<string, unknown>,
							ficaComparisonContext: {
								companyName: formData.applicantDetails?.registeredName,
								tradingName: formData.applicantDetails?.tradingName,
								registrationNumber: registrationOrIdNumber,
								idNumber: registrationOrIdNumber,
								contactName: formData.applicantDetails?.contactPerson,
								email: formData.applicantDetails?.email,
								phone: formData.applicantDetails?.telephone,
							},
						},
						submittedAt: new Date().toISOString(),
					},
				});
			}

			if (formType === "absa_6995") {
				await inngest.send({
					name: "form/absa-6995.completed",
					data: {
						workflowId: workflowIdNum,
						applicantId: workflow[0].applicantId,
						completedAt: new Date().toISOString(),
					},
				});
			}
		}

		return NextResponse.json({
			success: true,
			formId,
			submissionId: submission.id,
			version: nextVersion,
			status: isDraft ? "in_progress" : "submitted",
		});
	} catch (error) {
		console.error("Failed to save form:", error);
		return NextResponse.json({ error: "Failed to save form data" }, { status: 500 });
	}
}

/**
 * PUT /api/onboarding/forms/[workflowId]/[formType]
 * Update form status (for review)
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ workflowId: string; formType: string }> }
) {
	const { workflowId, formType } = await params;

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	try {
		const body = await request.json();
		const { status, reviewNotes, reviewedBy } = body;

		if (!status) {
			return NextResponse.json({ error: "Status is required" }, { status: 400 });
		}

		const workflowIdNum = parseInt(workflowId);

		// Get the form
		const existingForm = await db
			.select()
			.from(internalForms)
			.where(
				and(
					eq(internalForms.workflowId, workflowIdNum),
					eq(internalForms.formType, formType as any)
				)
			)
			.limit(1);

		const formRecord = existingForm[0];
		if (!formRecord) {
			return NextResponse.json({ error: "Form not found" }, { status: 404 });
		}

		// Update form status
		await db
			.update(internalForms)
			.set({
				status,
				reviewNotes,
				reviewedBy,
				reviewedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(internalForms.id, formRecord.id));

		return NextResponse.json({
			success: true,
			status,
		});
	} catch (error) {
		console.error("Failed to update form status:", error);
		return NextResponse.json({ error: "Failed to update form status" }, { status: 500 });
	}
}
