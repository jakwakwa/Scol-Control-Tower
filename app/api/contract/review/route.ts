/**
 * Contract Submission API — External Magic Link
 *
 * Accepts the signed Stratcol Agreement from the unauthenticated
 * contract form (magic link). Validates the token, records the
 * submission, and emits 'contract/signed' to advance the Inngest
 * workflow.
 *
 * POST /api/contract/review
 * Body: { token, data }
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest";
import {
	getFormInstanceByToken,
	recordFormSubmission,
} from "@/lib/services/form.service";
import { stratcolAgreementSchema } from "@/lib/validations/forms";

const SubmissionSchema = z.object({
	token: z.string().min(1, "Token is required"),
	data: stratcolAgreementSchema,
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validationResult = SubmissionSchema.safeParse(body);

		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validationResult.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const { token, data } = validationResult.data;

		// 1. Validate token
		const formInstance = await getFormInstanceByToken(token);

		if (!formInstance) {
			return NextResponse.json(
				{ error: "Invalid or expired contract link" },
				{ status: 404 }
			);
		}

		if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
			return NextResponse.json({ error: "Contract link has expired" }, { status: 410 });
		}

		if (formInstance.status === "submitted") {
			return NextResponse.json(
				{ error: "Contract has already been submitted" },
				{ status: 409 }
			);
		}

		// 2. Record the submission
		await recordFormSubmission({
			applicantMagiclinkFormId: formInstance.id,
			applicantId: formInstance.applicantId,
			workflowId: formInstance.workflowId,
			formType: "AGREEMENT_CONTRACT",
			data: data as unknown as Record<string, unknown>,
			submittedBy: data.authorisedRepresentative?.name || "external",
		});

		// 3. Emit Inngest event to advance workflow
		if (formInstance.workflowId) {
			await inngest.send({
				name: "form/decision.responded",
				data: {
					workflowId: formInstance.workflowId,
					applicantId: formInstance.applicantId,
					formType: "AGREEMENT_CONTRACT",
					decision: "APPROVED",
					respondedAt: new Date().toISOString(),
				},
			});

			await inngest.send({
				name: "contract/signed",
				data: {
					workflowId: formInstance.workflowId,
					applicantId: formInstance.applicantId,
					signedAt: new Date().toISOString(),
					signedBy: data.authorisedRepresentative?.name,
				},
			});
		}

		return NextResponse.json({
			success: true,
			message: "Contract submitted successfully",
			applicantId: formInstance.applicantId,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[ContractSubmission] Error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
