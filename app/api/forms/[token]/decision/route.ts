import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { inngest } from "@/inngest";
import { getFormInstanceByToken, recordFormDecision } from "@/lib/services/form.service";
import {
	createWorkflowNotification,
	logWorkflowEvent,
} from "@/lib/services/notification-events.service";
import type { DecisionEnabledFormType, FormDecisionOutcome } from "@/lib/types";

const decisionSchema = z.object({
	decision: z.enum(["APPROVED", "DECLINED"]),
	reason: z.string().max(500).optional(),
});

const DECISION_ENABLED_FORMS: DecisionEnabledFormType[] = [
	"SIGNED_QUOTATION",
	"STRATCOL_CONTRACT",
	"CALL_CENTRE_APPLICATION",
];

const isDecisionEnabledForm = (value: string): value is DecisionEnabledFormType =>
	DECISION_ENABLED_FORMS.includes(value as DecisionEnabledFormType);

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ token: string }> }
) {
	try {
		const { token } = await params;
		const payload = await request.json();
		const parsed = decisionSchema.safeParse(payload);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid decision payload", details: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		const formInstance = await getFormInstanceByToken(token);
		if (!formInstance) {
			return NextResponse.json({ error: "Form link is invalid" }, { status: 404 });
		}

		if (!isDecisionEnabledForm(formInstance.formType)) {
			return NextResponse.json(
				{ error: "This form does not support approve/decline decisions" },
				{ status: 400 }
			);
		}

		if (formInstance.decisionStatus === "responded") {
			return NextResponse.json(
				{
					success: true,
					alreadyResponded: true,
					decision: formInstance.decisionOutcome,
				},
				{ status: 200 }
			);
		}

		if (formInstance.status === "revoked") {
			return NextResponse.json({ error: "Form link has been revoked" }, { status: 410 });
		}

		if (formInstance.expiresAt && new Date(formInstance.expiresAt) < new Date()) {
			return NextResponse.json({ error: "Form link has expired" }, { status: 410 });
		}

		const decision = parsed.data.decision as FormDecisionOutcome;
		const reason = parsed.data.reason?.trim() || undefined;

		// For approvals, ensure user actually submitted the form content first.
		if (decision === "APPROVED" && formInstance.status !== "submitted") {
			return NextResponse.json(
				{
					error: "Please submit the form details first, then approve the process.",
				},
				{ status: 409 }
			);
		}

		await recordFormDecision({
			formInstanceId: formInstance.id,
			outcome: decision,
			reason,
		});

		if (formInstance.workflowId) {
			await logWorkflowEvent({
				workflowId: formInstance.workflowId,
				eventType: "stage_change",
				payload: {
					step: "form-decision-recorded",
					formType: formInstance.formType,
					decision,
					reason,
					applicantMagiclinkFormId: formInstance.id,
				},
			});
		}

		const db = getDatabaseClient();

		if (formInstance.workflowId && formInstance.formType === "SIGNED_QUOTATION") {
			if (!db) {
				return NextResponse.json(
					{ error: "Database connection failed" },
					{ status: 500 }
				);
			}
			const [latestQuote] = await db
				.select()
				.from(quotes)
				.where(eq(quotes.workflowId, formInstance.workflowId))
				.orderBy(desc(quotes.createdAt))
				.limit(1);

			if (!latestQuote) {
				return NextResponse.json(
					{ error: "No quote available for this workflow" },
					{ status: 404 }
				);
			}

			await db
				.update(quotes)
				.set({
					status: decision === "APPROVED" ? "approved" : "rejected",
					updatedAt: new Date(),
				})
				.where(eq(quotes.id, latestQuote.id));

			await inngest.send({
				name: "quote/responded",
				data: {
					workflowId: formInstance.workflowId,
					applicantId: formInstance.applicantId,
					quoteId: latestQuote.id,
					decision,
					reason,
					respondedAt: new Date().toISOString(),
				},
			});

			if (decision === "APPROVED") {
				await inngest.send({
					name: "quote/signed",
					data: {
						workflowId: formInstance.workflowId,
						applicantId: formInstance.applicantId,
						quoteId: latestQuote.id,
						signedAt: new Date().toISOString(),
					},
				});
			}
		}

		if (formInstance.workflowId && formInstance.formType !== "SIGNED_QUOTATION") {
			await inngest.send({
				name: "form/decision.responded",
				data: {
					workflowId: formInstance.workflowId,
					applicantId: formInstance.applicantId,
					formType: formInstance.formType,
					decision,
					reason,
					respondedAt: new Date().toISOString(),
				},
			});

			if (formInstance.formType === "STRATCOL_CONTRACT" && decision === "APPROVED") {
				await inngest.send({
					name: "contract/signed",
					data: {
						workflowId: formInstance.workflowId,
						signedAt: new Date().toISOString(),
					},
				});
			}
		}

		if (formInstance.workflowId) {
			await createWorkflowNotification({
				workflowId: formInstance.workflowId,
				applicantId: formInstance.applicantId,
				type: decision === "APPROVED" ? "completed" : "warning",
				title:
					decision === "APPROVED"
						? `${formInstance.formType.replace(/_/g, " ")} approved`
						: `${formInstance.formType.replace(/_/g, " ")} declined`,
				message:
					decision === "APPROVED"
						? "Applicant approved this step."
						: `Applicant declined this step${reason ? `: ${reason}` : "."}`,
				actionable: false,
			});
		}

		return NextResponse.json({
			success: true,
			formType: formInstance.formType,
			decision,
		});
	} catch (error) {
		console.error("[FormDecision] Error:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
