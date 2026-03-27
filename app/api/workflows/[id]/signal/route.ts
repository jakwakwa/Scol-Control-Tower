import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest";
import { requireAuthOrBearer } from "@/lib/auth/api-auth";

const uiSignalSchema = z.object({
	signalName: z.enum(["qualityGatePassed", "humanOverride"]),
	payload: z.unknown(),
});

/**
 * POST /api/workflows/[id]/signal
 * Signal a running workflow via Inngest events. Supports internal UI signals ({ signalName, payload }).
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
		const workflowId = parseInt(id, 10);

		if (Number.isNaN(workflowId)) {
			return NextResponse.json({ error: "Invalid workflow ID" }, { status: 400 });
		}

		const body: unknown = await request.json();
		const validation = uiSignalSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Invalid signal data",
					details: validation.error.flatten(),
				},
				{ status: 400 }
			);
		}

		const { signalName, payload: _payload } = validation.data;

		if (signalName === "qualityGatePassed") {
			await inngest.send({
				name: "onboarding/quality-gate-passed",
				data: {
					workflowId,
					approverId: "human_reviewer",
					timestamp: new Date().toISOString(),
				},
			});
		}

		return NextResponse.json({ success: true, signal: signalName });
	} catch (error) {
		console.error("Error signaling workflow:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json(
			{ error: "Failed to signal workflow", details: message },
			{ status: 500 }
		);
	}
}
