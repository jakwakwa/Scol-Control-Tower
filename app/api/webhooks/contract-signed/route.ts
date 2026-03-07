import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/inngest";

// Schema for incoming Google Form data for Contract Signing
const contractSignedSchema = z.object({
	workflowId: z.coerce.number(),
	companyName: z.string().optional(),
	signedUrl: z.string().optional(),
	secret: z.string().min(1, "Secret is required"), // Shared secret for auth
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// 1. Validation
		const validation = contractSignedSchema.safeParse(body);
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

		// 2. Auth Check
		const expectedSecret =
			process.env.GAS_WEBHOOK_SECRET || process.env.CRON_SECRET || "temp_dev_secret";
		if (data.secret !== expectedSecret) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// 3. Trigger Inngest Event
		await inngest.send({
			name: "contract/signed",
			data: {
				workflowId: data.workflowId,
				contractUrl: data.signedUrl,
				signedAt: new Date().toISOString(),
			},
		});

		return NextResponse.json(
			{
				success: true,
				workflowId: data.workflowId,
				message: "Contract signed event received",
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error in contract-signed webhook:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
