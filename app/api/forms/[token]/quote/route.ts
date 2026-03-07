import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { getFormInstanceByToken } from "@/lib/services/form.service";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ token: string }> }
) {
	try {
		const { token } = await params;
		const formInstance = await getFormInstanceByToken(token);

		if (!formInstance) {
			return NextResponse.json({ error: "Form link is invalid" }, { status: 404 });
		}

		if (formInstance.formType !== "SIGNED_QUOTATION") {
			return NextResponse.json(
				{ error: "Quote details are only available for signed quotation forms" },
				{ status: 400 }
			);
		}

		if (!formInstance.workflowId) {
			return NextResponse.json(
				{ error: "Workflow context missing for this form" },
				{ status: 400 }
			);
		}

		const db = getDatabaseClient();
		if (!db) {
			return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
		}

		const [quote] = await db
			.select()
			.from(quotes)
			.where(eq(quotes.workflowId, formInstance.workflowId))
			.orderBy(desc(quotes.createdAt))
			.limit(1);

		if (!quote) {
			return NextResponse.json(
				{ error: "No quote available for this form" },
				{ status: 404 }
			);
		}

		return NextResponse.json({ quote });
	} catch (error) {
		console.error("[FormQuote] Error:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
