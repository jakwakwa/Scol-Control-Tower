import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { isMockEnvironmentEnabled } from "@/lib/mock-environment";
import { isMockScenarioId } from "@/lib/mock-scenarios";

const MockScenarioRunSchema = z.object({
	workflowId: z.number().int().positive(),
	applicantId: z.number().int().positive(),
	scenarioId: z.string(),
});

export async function POST(request: NextRequest) {
	if (!isMockEnvironmentEnabled()) {
		return NextResponse.json(
			{ error: "Mock scenario runner is only available in mock mode" },
			{ status: 403 }
		);
	}

	try {
		const body = await request.json();
		const parsed = MockScenarioRunSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		if (!isMockScenarioId(parsed.data.scenarioId)) {
			return NextResponse.json({ error: "Unsupported mock scenario" }, { status: 400 });
		}

		await inngest.send({
			name: "dev/mock-scenario.run",
			data: {
				workflowId: parsed.data.workflowId,
				applicantId: parsed.data.applicantId,
				scenarioId: parsed.data.scenarioId,
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[MockScenarioRun] Error:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Unexpected error" },
			{ status: 500 }
		);
	}
}