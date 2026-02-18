import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest";
import {
	getFormInstanceByToken,
	recordFormSubmission,
} from "@/lib/services/form.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import type { FormType } from "@/lib/types";
import {
	absa6995Schema,
	accountantLetterSchema,
	callCentreApplicationSchema,
	type FacilityApplicationForm,
	facilityApplicationSchema,
	signedQuotationSchema,
	stratcolContractSchema,
} from "@/lib/validations/forms";

const formSubmissionSchema = z.object({
	token: z.string().min(10),
	formType: z.enum([
		"FACILITY_APPLICATION",
		"SIGNED_QUOTATION",
		"STRATCOL_CONTRACT",
		"ABSA_6995",
		"ACCOUNTANT_LETTER",
		"CALL_CENTRE_APPLICATION",
	]),
	data: z.record(z.string(), z.unknown()),
});

const formSchemaMap: Record<FormType, z.ZodSchema> = {
	FACILITY_APPLICATION: facilityApplicationSchema,
	SIGNED_QUOTATION: signedQuotationSchema,
	STRATCOL_CONTRACT: stratcolContractSchema,
	ABSA_6995: absa6995Schema,
	ACCOUNTANT_LETTER: accountantLetterSchema,
	CALL_CENTRE_APPLICATION: callCentreApplicationSchema,
	DOCUMENT_UPLOADS: z.any(),
};

const extractSubmittedBy = (formType: FormType, data: Record<string, unknown>) => {
	if (formType === "SIGNED_QUOTATION" || formType === "STRATCOL_CONTRACT") {
		return typeof data.signatureName === "string" ? data.signatureName : undefined;
	}

	if (formType === "ABSA_6995") {
		const signatures = data.signatures as { clientName?: string } | undefined;
		return signatures?.clientName;
	}

	return undefined;
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
				const serviceTypes = facilityData.serviceTypes || [];

				let mandateType: "EFT" | "DEBIT_ORDER" | "CASH" | "MIXED" = "EFT";
				const hasDebicheck = serviceTypes.includes("DebiCheck");
				// Consider other service types as EFT for now
				const hasEft = serviceTypes.some(type => type !== "DebiCheck");

				if (hasDebicheck && hasEft) {
					mandateType = "MIXED";
				} else if (hasDebicheck) {
					mandateType = "DEBIT_ORDER";
				}

				// Assuming maxRandValue is in Rands, convert to cents
				const mandateVolume = (facilityData.maxRandValue || 0) * 100;

				await inngest.send({
					name: "form/facility.submitted",
					data: {
						workflowId: formInstance.workflowId,
						applicantId: formInstance.applicantId,
						submissionId: submission.id,
						formData: {
							mandateVolume,
							mandateType,
							businessType: "Unknown",
							annualTurnover:
								(facilityData.forecastVolume || 0) *
								(facilityData.forecastAverageValue || 0) *
								12,
						},
						submittedAt: new Date().toISOString(),
					},
				});
			}

			if (formType === "ACCOUNTANT_LETTER") {
				await inngest.send({
					name: "form/accountant-letter.submitted",
					data: {
						workflowId: formInstance.workflowId,
						applicantId: formInstance.applicantId,
						submissionId: submission.id,
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
