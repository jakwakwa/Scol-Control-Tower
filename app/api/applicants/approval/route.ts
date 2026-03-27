import { type NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import { getDatabaseClient } from "@/app/utils";
import { workflows } from "@/db/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { z } from "zod";
import { acquireStateLock } from "@/lib/services/state-lock.service";
import { requireAuthOrBearer } from "@/lib/auth/api-auth";
import { captureServerEvent } from "@/lib/posthog-server";

// Flexible schema to handle both Quote and Approval payloads
const approvalSchema = z.object({
	workflowId: z.number().optional(),
	applicantId: z.number().optional(),
	// Quote fields
	quoteId: z.string().optional(),
	amount: z.number().optional(),
	terms: z.string().optional(),
	// Approval fields
	approved: z.boolean().optional(),
	approver: z.string().optional(),
	comments: z.string().optional(),
	// Decision routing metadata — preferred over stage inference
	decisionType: z.string().optional(),
});

/**
 * POST /api/applicants/approval
 *
 * Handles callbacks from external platforms.
 * Depending on the payload and the current state of the workflow (if we could check),
 * it sends either a "Quote Generated" event or a "Quality Gate Passed" event.
 *
 * Since the user reported being stuck on "wait-for-quote" but calling "applicants/approval",
 * we prioritize checking for Quote data.
 */
export async function POST(request: NextRequest) {
	try {
		const authResult = await requireAuthOrBearer(request);
		if (authResult instanceof NextResponse) {
			return authResult;
		}

		const rawBody = await request.text();

		let body;
		try {
			body = JSON.parse(rawBody);
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const validation = approvalSchema.safeParse(body);

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

		// Attempt to resolve workflowId if missing, AND get workflow status for inference
		let workflowId = data.workflowId;
		let workflow: InferSelectModel<typeof workflows> | undefined;
		const db = await getDatabaseClient();

		if (db) {
			if (workflowId) {
				workflow = await db.query.workflows.findFirst({
					where: eq(workflows.id, workflowId),
				});
			} else if (data.applicantId) {
				workflow = await db.query.workflows.findFirst({
					where: eq(workflows.applicantId, data.applicantId),
					orderBy: (workflows, { desc }) => [desc(workflows.startedAt)],
				});
				if (workflow) {
					workflowId = workflow.id;
				}
			}
		}

		if (!workflowId) {
			console.warn("[API] Could not resolve workflowId from request");
			// proceed? We might need it for matching.
		}

		// DECISION LOGIC:
		// 1. If explicit decisionType is provided, use it to route (preferred, stage-decoupled).
		// 2. If explicit 'quoteId' is present, send QUOTE event.
		// 3. If 'approved' is explicitly true, send QUALITY GATE event.
		// 4. Fallback: Infer from workflow decisionType metadata, then stage/status.

		let eventName = "";
		const eventData: any = { workflowId, applicantId: data.applicantId };

		const resolvedDecisionType = data.decisionType || workflow?.decisionType;

		if (resolvedDecisionType === "quote_approval" || data.quoteId || data.amount) {
			eventName = "onboarding/quote-generated";
			eventData.quote = {
				quoteId: data.quoteId || "generated-via-external",
				amount: data.amount || 0,
				terms: data.terms || "Standard terms",
			};
		} else if (resolvedDecisionType === "quality_gate" || data.approved === true) {
			eventName = "onboarding/quality-gate-passed";
			eventData.result = {
				approved: true,
				approver: data.approver || "External Webhook",
				comments: data.comments || "Approved via external callback",
				timestamp: new Date().toISOString(),
			};
		} else {
			// Legacy fallback: infer from stage/status
			if (workflow?.stage === 2) {
				if (workflow.status === "processing") {
					eventName = "onboarding/quote-generated";
					eventData.quote = {
						quoteId: "inferred-via-external",
						amount: 0,
						terms: "Standard terms (Inferred)",
					};
				} else if (workflow.status === "awaiting_human") {
					eventName = "onboarding/quality-gate-passed";
					eventData.result = {
						approved: true,
						approver: "External Webhook (Inferred)",
						comments: "Approved via external callback (Inferred)",
						timestamp: new Date().toISOString(),
					};
				}
			}

			if (!eventName) {
				if (data.approved !== false) {
					eventName = "onboarding/quality-gate-passed";
					eventData.result = {
						approved: true,
						approver: data.approver || "External Webhook",
						comments: data.comments || "Approved via external callback",
						timestamp: new Date().toISOString(),
					};
				} else {
					return NextResponse.json(
						{ error: "Ambiguous payload. Provide decisionType, quoteId, or approved:true" },
						{ status: 400 }
					);
				}
			}
		}

		if (workflowId && eventName) {
			await acquireStateLock(workflowId, data.approver || "external_callback");

			await inngest.send({
				name: eventName as any,
				data: eventData,
			});
		}

		if (eventName) {
			captureServerEvent({
				distinctId: data.applicantId?.toString() ?? workflowId?.toString() ?? "unknown",
				event: "approval_callback_received",
				properties: {
					applicant_id: data.applicantId,
					workflow_id: workflowId,
					routed_to: eventName,
					approval_status: data.approved,
				},
			});
		}

		return NextResponse.json(
			{ success: true, event: eventName, workflowId },
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error processing approval callback:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
