"use server";

import { inngest } from "@/inngest/client";
import { getDatabaseClient } from "@/app/utils";
import { internalForms, internalSubmissions, workflows } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { FacilityApplicationForm } from "@/lib/validations/forms";

const toNumber = (value: unknown): number => {
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	if (typeof value === "string") {
		const parsed = Number(value.replace(/[R,\s]/g, ""));
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

const deriveMandateType = (
	serviceTypes: string[] | undefined
): "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED" => {
	const normalizedServiceTypes = serviceTypes ?? [];
	const hasDebicheck = normalizedServiceTypes.includes("DebiCheck");
	const hasEft = normalizedServiceTypes.some(type => type !== "DebiCheck");
	if (hasDebicheck && hasEft) return "MIXED";
	if (hasDebicheck) return "DEBIT_ORDER";
	return "EFT";
};

export async function retryFacilitySubmission(workflowId: number) {
	const db = getDatabaseClient();
	if (!db) {
		return { success: false, error: "Database connection failed" };
	}

	try {
		// 1. Get the workflow to ensure it exists and get applicantId
		const workflowResult = await db
			.select()
			.from(workflows)
			.where(eq(workflows.id, workflowId))
			.limit(1);
		if (!workflowResult.length) {
			return { success: false, error: "Workflow not found" };
		}
		const applicantId = workflowResult[0].applicantId;

		// 2. Find the facility application form for this workflow
		const formResults = await db
			.select()
			.from(internalForms)
			.where(
				and(
					eq(internalForms.workflowId, workflowId),
					eq(internalForms.formType, "facility_application")
				)
			)
			.limit(1);

		if (formResults.length === 0) {
			return { success: false, error: "Facility application form not found" };
		}
		const form = formResults[0];

		// 3. Get the latest submission
		const submissionResults = await db
			.select()
			.from(internalSubmissions)
			.where(eq(internalSubmissions.internalFormId, form.id))
			.orderBy(desc(internalSubmissions.createdAt))
			.limit(1);

		if (submissionResults.length === 0) {
			return { success: false, error: "No submission found for facility application" };
		}
		const submission = submissionResults[0];

		// 4. Parse the form data
		let formData: FacilityApplicationForm;
		try {
			formData = JSON.parse(submission.formData);
		} catch (_e) {
			return { success: false, error: "Failed to parse form data" };
		}

		// 5. Construct the event payload (same logic as in the route handler)
		const serviceTypes =
			formData.facilitySelection?.serviceTypes?.length
				? formData.facilitySelection.serviceTypes
				: formData.serviceTypes || [];
		const mandateType = deriveMandateType(serviceTypes);
		const mandateVolume =
			toNumber(
				formData.volumeMetrics?.limitsAppliedFor?.maxRandValue ?? formData.maxRandValue
			) * 100;
		const forecastVolume =
			formData.volumeMetrics?.predictedGrowth?.forecastVolume ?? formData.forecastVolume;
		const forecastAverageValue =
			formData.volumeMetrics?.predictedGrowth?.forecastAverageValue ??
			formData.forecastAverageValue;
		const registrationOrIdNumber = formData.applicantDetails?.registrationOrIdNumber;

		// 6. Send the event
		await inngest.send({
			name: "form/facility.submitted",
			data: {
				workflowId: workflowId,
				applicantId: applicantId,
				submissionId: submission.id,
				formData: {
					mandateVolume,
					mandateType,
					businessType: "Unknown",
					annualTurnover: toNumber(forecastVolume) * toNumber(forecastAverageValue) * 12,
					facilityApplicationData: formData as unknown as Record<string, unknown>,
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

		return { success: true, message: "Event re-triggered successfully" };
	} catch (error) {
		console.error("Failed to retry facility submission:", error);
		return { success: false, error: "Unexpected error" };
	}
}
