import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { inngest } from "@/inngest";
import { captureServerEvent } from "@/lib/posthog-server";
import {
	getFormInstanceByToken,
	recordFormDecision,
	recordFormSubmission,
} from "@/lib/services/form.service";
import { syncSignedQuotationDecisionToQuoteAndInngest } from "@/lib/services/signed-quotation-workflow.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import type { FormType } from "@/lib/types";
import {
	callCentreApplicationSchema,
	type FacilityApplicationForm,
	facilityApplicationSchema,
	signedQuotationSchema,
	stratcolAgreementSchema,
} from "@/lib/validations/forms";

const formSubmissionSchema = z.object({
	token: z.string().min(10),
	formType: z.enum([
		"FACILITY_APPLICATION",
		"SIGNED_QUOTATION",
		"AGREEMENT_CONTRACT",
		"CALL_CENTRE_APPLICATION",
	]),
	data: z.record(z.string(), z.unknown()),
});

const formSchemaMap: Record<FormType, z.ZodSchema> = {
	FACILITY_APPLICATION: facilityApplicationSchema,
	SIGNED_QUOTATION: signedQuotationSchema,
	AGREEMENT_CONTRACT: stratcolAgreementSchema,
	CALL_CENTRE_APPLICATION: callCentreApplicationSchema,
	DOCUMENT_UPLOADS: z.any(),
};

const extractSubmittedBy = (formType: FormType, data: Record<string, unknown>) => {
	if (formType === "SIGNED_QUOTATION" || formType === "AGREEMENT_CONTRACT") {
		return typeof data.signatureName === "string" ? data.signatureName : undefined;
	}
	return undefined;
};

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

const buildFacilitySubmissionFormData = (facilityData: FacilityApplicationForm) => {
	const legacyServiceTypes = facilityData.serviceTypes || [];
	const nestedServiceTypes = facilityData.facilitySelection?.serviceTypes || [];
	const serviceTypes = nestedServiceTypes.length > 0 ? nestedServiceTypes : legacyServiceTypes;

	const nestedMaxRandValue = facilityData.volumeMetrics?.limitsAppliedFor?.maxRandValue;
	const legacyMaxRandValue = facilityData.maxRandValue;
	const mandateVolume = toNumber(nestedMaxRandValue ?? legacyMaxRandValue) * 100;

	const forecastVolume =
		facilityData.volumeMetrics?.predictedGrowth?.forecastVolume ?? facilityData.forecastVolume;
	const forecastAverageValue =
		facilityData.volumeMetrics?.predictedGrowth?.forecastAverageValue ??
		facilityData.forecastAverageValue;

	const applicantDetails = facilityData.applicantDetails ?? {};
	const registrationOrIdNumber = applicantDetails.registrationOrIdNumber;

	return {
		mandateVolume,
		mandateType: deriveMandateType(serviceTypes),
		businessType: "Unknown",
		annualTurnover: toNumber(forecastVolume) * toNumber(forecastAverageValue) * 12,
		facilityApplicationData: facilityData as unknown as Record<string, unknown>,
		ficaComparisonContext: {
			companyName: applicantDetails.registeredName,
			tradingName: applicantDetails.tradingName,
			registrationNumber: registrationOrIdNumber,
			idNumber: registrationOrIdNumber,
			contactName: applicantDetails.contactPerson,
			email: applicantDetails.email,
			phone: applicantDetails.telephone,
		},
	};
};

export async function POST(request: NextRequest) {
	try {
		const payload = await request.json();
		const parsed = formSubmissionSchema.safeParse(payload);

		if (!parsed.success) {
			return NextResponse.json(
				{
					error: "Invalid submission payload",
					details: parsed.error.flatten(),
				},
				{ status: 400 }
			);
		}

		const { token, formType, data } = parsed.data;
		const formInstance = await getFormInstanceByToken(token);

		if (!formInstance) {
			return NextResponse.json({ error: "Form link is invalid" }, { status: 404 });
		}

		if (formInstance.formType !== formType) {
			return NextResponse.json({ error: "Form type mismatch" }, { status: 400 });
		}

		if (formInstance.status === "submitted") {
			return NextResponse.json({ error: "Form already submitted" }, { status: 409 });
		}

		if (formInstance.status === "revoked") {
			return NextResponse.json({ error: "Form link has been revoked" }, { status: 410 });
		}

		if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
			return NextResponse.json({ error: "Form link has expired" }, { status: 410 });
		}

		const schema = formSchemaMap[formType];
		const validation = schema.safeParse(data);

		if (!validation.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: validation.error.flatten() },
				{ status: 400 }
			);
		}

		const submission = await recordFormSubmission({
			applicantMagiclinkFormId: formInstance.id,
			applicantId: formInstance.applicantId,
			workflowId: formInstance.workflowId,
			formType,
			data: validation.data as Record<string, unknown>,
			submittedBy: extractSubmittedBy(
				formType,
				validation.data as Record<string, unknown>
			),
		});

		if (formInstance.workflowId) {
			await logWorkflowEvent({
				workflowId: formInstance.workflowId,
				eventType: "stage_change",
				payload: {
					step: "form-submitted",
					formType,
					applicantMagiclinkFormId: formInstance.id,
				},
			});

			await createWorkflowNotification({
				workflowId: formInstance.workflowId,
				applicantId: formInstance.applicantId,
				type: "completed",
				title: "Form submitted",
				message: `${formType.replace(/_/g, " ")} submitted successfully.`,
				actionable: false,
			});
		}

		// Signed quotation: sync quote + Inngest on submit so a failed /decision request cannot strand the workflow.
		if (formType === "SIGNED_QUOTATION" && formInstance.workflowId) {
			const db = getDatabaseClient();
			if (!db) {
				return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
			}
			const decisionUpdate = await recordFormDecision({
				formInstanceId: formInstance.id,
				outcome: "APPROVED",
			});
			if (decisionUpdate) {
				await logWorkflowEvent({
					workflowId: formInstance.workflowId,
					eventType: "stage_change",
					payload: {
						step: "form-decision-recorded",
						formType,
						decision: "APPROVED" as const,
						applicantMagiclinkFormId: formInstance.id,
					},
				});
				const syncResult = await syncSignedQuotationDecisionToQuoteAndInngest(
					db,
					formInstance.workflowId,
					formInstance.applicantId,
					"APPROVED"
				);
				if (!syncResult.ok) {
					return NextResponse.json(
						{ error: "No quote available for this workflow" },
						{ status: 404 }
					);
				}
				await createWorkflowNotification({
					workflowId: formInstance.workflowId,
					applicantId: formInstance.applicantId,
					type: "completed",
					title: "SIGNED QUOTATION approved",
					message: "Applicant approved this step.",
					actionable: false,
				});
				captureServerEvent({
					distinctId: `applicant_${formInstance.applicantId}`,
					event: "quote_pipeline",
					properties: {
						step: "signed_quotation_submit",
						path: "/api/forms/submit",
						workflow_id: formInstance.workflowId,
						applicant_id: formInstance.applicantId,
						quote_id: syncResult.quoteId,
						inngest_sync: "ok",
					},
				});
			}
		}

		if (formInstance.workflowId) {
			await inngest.send({
				name: "form/submitted",
				data: {
					workflowId: formInstance.workflowId,
					applicantId: formInstance.applicantId,
					formType,
					applicantMagiclinkFormId: formInstance.id,
					submittedAt: new Date().toISOString(),
				},
			});

			if (formType === "FACILITY_APPLICATION") {
				const facilityData = validation.data as FacilityApplicationForm;
				const mappedFormData = buildFacilitySubmissionFormData(facilityData);

				await inngest.send({
					name: "form/facility.submitted",
					data: {
						workflowId: formInstance.workflowId,
						applicantId: formInstance.applicantId,
						submissionId: submission.id,
						formData: mappedFormData,
						submittedAt: new Date().toISOString(),
					},
				});
			}

			if (formType === "CALL_CENTRE_APPLICATION") {
				await inngest.send({
					name: "form/call-centre.submitted",
					data: {
						workflowId: formInstance.workflowId,
						applicantId: formInstance.applicantId,
						submissionId: submission.id,
						submittedAt: new Date().toISOString(),
					},
				});
			}

		}

		captureServerEvent({
			distinctId: `applicant_${formInstance.applicantId}`,
			event: "form_submitted",
			properties: {
				form_type: formType,
				workflow_id: formInstance.workflowId,
				applicant_id: formInstance.applicantId,
				submission_id: submission.id,
			},
		});

		return NextResponse.json({
			success: true,
			message: "Form submitted successfully",
		});
	} catch (error) {
		console.error("[FormSubmit] Error:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
