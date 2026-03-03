import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import { z } from "zod";
import { requireAuthOrBearer } from "@/lib/auth/api-auth";

// Schema for internal UI signals
const uiSignalSchema = z.object({
	signalName: z.enum(["qualityGatePassed", "humanOverride"]),
	payload: z.any(),
});

// Schema for Platform / Agent Callbacks
const agentCallbackSchema = z.object({
	workflowId: z.union([z.string(), z.number()]).optional(),
	agentId: z.string().optional(),
	status: z.string().optional(),
	decision: z.object({
		outcome: z.string(),
		manualOverrides: z.any().optional(),
		reason: z.string().optional(),
	}),
	audit: z
		.object({
			humanActor: z.string().optional(),
			timestamp: z.string().optional(),
		})
		.optional(),
});

/**
 * POST /api/workflows/[id]/signal
 * Signal a running workflow via Inngest events. Supports:
 * 1. Internal UI Signals ({ signalName, payload })
 * 2. External Agent Webhooks (Direct JSON payload)
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const authResult = await requireAuthOrBearer(request);
		if (authResult instanceof NextResponse) {
			return authResult;
		}

		const { id } = await params;
		const workflowId = parseInt(id);

		if (isNaN(workflowId)) {
			return NextResponse.json({ error: "Invalid workflow ID" }, { status: 400 });
		}

		const body = await request.json();

		// 1. Try parsing as UI Signal
		const uiValidation = uiSignalSchema.safeParse(body);
		if (uiValidation.success) {
			const { signalName, payload } = uiValidation.data;

			if (signalName === "qualityGatePassed") {
				await inngest.send({
					name: "onboarding/quality-gate-passed",
					data: {
						workflowId,
						approverId: "human_reviewer", // Defaulting to generic human reviewer as specific ID isn't passed in UI signal yet
						timestamp: new Date().toISOString(),
					},
				});
			}

			console.log(`[API] Sent Inngest event for Workflow ${workflowId}: ${signalName}`);
			return NextResponse.json({ success: true, signal: signalName });
		}

		// 2. Try parsing as Agent Callback
		const agentValidation = agentCallbackSchema.safeParse(body);
		if (agentValidation.success) {
			const agentData = agentValidation.data;

			await inngest.send({
				name: "onboarding/agent-callback",
				data: {
					workflowId,
					decision: {
						agentId: agentData.agentId || "external",
						outcome: agentData.decision.outcome as "APPROVED" | "REJECTED",
						reason: agentData.decision.reason,
						timestamp: agentData.audit?.timestamp || new Date().toISOString(),
					},
				},
			});

			console.log(`[API] Sent Agent Callback event for Workflow ${workflowId}`);
			return NextResponse.json({
				success: true,
				signal: "agentCallbackReceived",
			});
		}

		// Failed both validations
		return NextResponse.json(
			{
				error: "Invalid signal data",
				details: {
					uiError: uiValidation.error.flatten(),
					agentError: agentValidation.error.flatten(),
				},
			},
			{ status: 400 }
		);
	} catch (error) {
		console.error("Error signaling workflow:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json(
			{ error: "Failed to signal workflow", details: message },
			{ status: 500 }
		);
	}
}
