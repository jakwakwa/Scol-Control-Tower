import { type NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest";
import { z } from "zod";

// Schema for Quote Generation Callback
const quoteCallbackSchema = z.object({
	applicantId: z.number(),
	companyName: z.string().optional(),
	quoteId: z.string(),
	amount: z.number(),
	terms: z.string().optional(),
	workflowId: z.number().optional(), // Make strict later if possible
});

/**
 * POST /api/callbacks/quotes
 * Handle callback from Quote Generation
 */
export async function POST(request: NextRequest) {
	try {
		// Log raw body for debugging
		const rawBody = await request.text();

		let body;
		try {
			body = JSON.parse(rawBody);
		} catch {
			// Handle if  sends form-data or other content types, but usually JSON
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const validation = quoteCallbackSchema.safeParse(body);

		if (!validation.success) {
			console.error(
				"[API] Quote Callback Validation Failed:",
				validation.error.flatten()
			);
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 }
			);
		}

		const data = validation.data;

		// We need workflowId to resume the correct workflow.
		// If  doesn't pass it back, we might need to lookup or assume.
		// For now, assuming it is passed back (we will add it to the payload sent TO ).
		if (!data.workflowId) {
			console.warn(
				"[API] Quote Callback missing workflowId - cannot resume workflow easily (unless we lookup by applicantId)"
			);
			// Potential lookup logic here if strictly needed
		}

		await inngest.send({
			name: "onboarding/quote-generated",
			data: {
				workflowId: data.workflowId!, // Assuming provided for now
				applicantId: data.applicantId,
				quote: {
					quoteId: data.quoteId,
					amount: data.amount,
					terms: data.terms || "Standard terms",
				},
			},
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error processing Quote callback:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
