/**
 * Signed quotation: keep quotes table + Inngest (quote/responded, quote/signed) in sync.
 * Used by POST /api/forms/submit (SIGNED_QUOTATION) and POST /api/forms/[token]/decision.
 */

import { desc, eq } from "drizzle-orm";
import type { getDatabaseClient } from "@/app/utils";
import { quotes } from "@/db/schema";
import { inngest } from "@/inngest";
import type { FormDecisionOutcome } from "@/lib/types";

type DbClient = NonNullable<ReturnType<typeof getDatabaseClient>>;

const INNGEST_SEND_RETRIES = 3;
const INNGEST_SEND_BASE_DELAY_MS = 200;

async function sleep(ms: number) {
	await new Promise<void>(resolve => {
		setTimeout(resolve, ms);
	});
}

export async function sendInngestEventReliably(payload: {
	name: string;
	data: Record<string, unknown>;
}): Promise<void> {
	let lastError: unknown;
	for (let attempt = 0; attempt < INNGEST_SEND_RETRIES; attempt++) {
		try {
			await inngest.send(payload as Parameters<typeof inngest.send>[0]);
			return;
		} catch (err) {
			lastError = err;
			if (attempt < INNGEST_SEND_RETRIES - 1) {
				await sleep(INNGEST_SEND_BASE_DELAY_MS * (attempt + 1));
			}
		}
	}
	throw lastError;
}

export type SignedQuotationSyncResult =
	| { ok: true; quoteId: number }
	| { ok: false; error: "no_quote" | "db_required" };

/**
 * Update latest quote row for workflow and emit domain events (retried).
 */
export async function syncSignedQuotationDecisionToQuoteAndInngest(
	db: DbClient,
	workflowId: number,
	applicantId: number,
	decision: FormDecisionOutcome,
	reason?: string
): Promise<SignedQuotationSyncResult> {
	const [latestQuote] = await db
		.select()
		.from(quotes)
		.where(eq(quotes.workflowId, workflowId))
		.orderBy(desc(quotes.createdAt))
		.limit(1);

	if (!latestQuote) {
		return { ok: false, error: "no_quote" };
	}

	await db
		.update(quotes)
		.set({
			status: decision === "APPROVED" ? "approved" : "rejected",
			updatedAt: new Date(),
		})
		.where(eq(quotes.id, latestQuote.id));

	await sendInngestEventReliably({
		name: "quote/responded",
		data: {
			workflowId,
			applicantId,
			quoteId: latestQuote.id,
			decision,
			reason,
			respondedAt: new Date().toISOString(),
		},
	});

	if (decision === "APPROVED") {
		await sendInngestEventReliably({
			name: "quote/signed",
			data: {
				workflowId,
				applicantId,
				quoteId: latestQuote.id,
				signedAt: new Date().toISOString(),
			},
		});
	}

	return { ok: true, quoteId: latestQuote.id };
}
