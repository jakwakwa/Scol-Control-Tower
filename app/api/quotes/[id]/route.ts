import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateQuoteSchema } from "@/lib/validations/quotes";

/**
 * PUT /api/quotes/[id]
 * Update a quote
 */
export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const db = await getDatabaseClient();

		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const resolvedParams = await params;
		const id = parseInt(resolvedParams.id, 10);

		if (Number.isNaN(id)) {
			return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
		}

		const body = await request.json();
		const validation = updateQuoteSchema.safeParse(body);

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

		const updatedQuoteResults = await db
			.update(quotes)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(quotes.id, id))
			.returning();

		if (updatedQuoteResults.length === 0) {
			return NextResponse.json({ error: "Quote not found" }, { status: 404 });
		}

		return NextResponse.json({ quote: updatedQuoteResults[0] });
	} catch (error) {
		console.error("Error updating quote:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
