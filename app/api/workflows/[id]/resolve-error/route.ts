import { inngest } from "@/inngest/client";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-auth";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const authResult = await requireAuth();
	if (authResult instanceof NextResponse) {
		return authResult;
	}

	const { id } = await params;
	const workflowId = parseInt(id, 10);

	if (Number.isNaN(workflowId)) {
		return NextResponse.json({ error: "Invalid Workflow ID" }, { status: 400 });
	}

	try {
		const body = await request.json();
		const { action } = body;

		if (!["retry", "cancel", "continue"].includes(action)) {
			return NextResponse.json({ error: "Invalid action" }, { status: 400 });
		}

		await inngest.send({
			name: "workflow/error-resolved",
			data: {
				workflowId,
				action,
			},
		});

		return NextResponse.json({ success: true, action });
	} catch (error) {
		console.error("Failed to resolve workflow error:", error);
		return NextResponse.json({ error: "Failed to process resolution" }, { status: 500 });
	}
}
