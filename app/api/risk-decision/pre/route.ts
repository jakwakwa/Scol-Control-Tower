import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";

const PreRiskDecisionSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	stage: z.enum(["pre_approval", "pre_evaluation"]),
	decision: z.object({
		outcome: z.enum(["APPROVED", "REJECTED"]),
		reason: z.string().max(500).optional(),
		requiresPreRiskEvaluation: z.boolean().optional(),
	}),
});

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const parsed = PreRiskDecisionSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const { workflowId, applicantId, stage, decision } = parsed.data;
		const eventName =
			stage === "pre_approval"
				? "risk/pre-approval.decided"
				: "risk/pre-evaluation.decided";

		await inngest.send({
			name: eventName,
			data: {
				workflowId,
				applicantId,
				decision: {
					outcome: decision.outcome,
					reason: decision.reason,
					requiresPreRiskEvaluation: decision.requiresPreRiskEvaluation,
					decidedBy: userId,
					timestamp: new Date().toISOString(),
				},
			},
		});

		return NextResponse.json({
			success: true,
			event: eventName,
		});
	} catch (error) {
		console.error("[PreRiskDecision] Error:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
