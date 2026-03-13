import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { createQuoteSchema } from "@/lib/validations/quotes";

/**
 * POST /api/quotes
 * Create a new quote
 */
export async function POST(request: NextRequest) {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const body = await request.json();

		const validation = createQuoteSchema.safeParse(body);

		if (!validation.success) {
			console.error(
				"❌ [API] Validation Failed:",
				JSON.stringify(validation.error.flatten(), null, 2)
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

		const newQuoteResults = await db
			.insert(quotes)
			.values({
				workflowId: data.workflowId,
				applicantId: data.applicantId,
				amount: data.amount,
				baseFeePercent: data.baseFeePercent,
				adjustedFeePercent: data.adjustedFeePercent,
				rationale: data.rationale,
				details: data.details,
				generatedBy: data.generatedBy || "platform",
				status: "draft",
			})
			.returning();

		return NextResponse.json({ quote: newQuoteResults[0] }, { status: 201 });
	} catch (error) {
		console.error("Error creating quote:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
