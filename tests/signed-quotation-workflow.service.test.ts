import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { quotes } from "@/db/schema";

const inngestSendMock = mock(async () => undefined);

mock.module("@/inngest", () => ({
	inngest: {
		send: inngestSendMock,
	},
}));

const {
	sendInngestEventReliably,
	syncSignedQuotationDecisionToQuoteAndInngest,
} = await import("../lib/services/signed-quotation-workflow.service");

function createTestDb() {
	const sqlite = new Database(":memory:");
	const db = drizzle(sqlite);

	db.run(sql`
		CREATE TABLE quotes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			applicant_id INTEGER,
			workflow_id INTEGER NOT NULL,
			amount INTEGER NOT NULL,
			base_fee_percent INTEGER NOT NULL,
			adjusted_fee_percent INTEGER,
			details TEXT,
			rationale TEXT,
			status TEXT NOT NULL DEFAULT 'draft',
			generated_by TEXT NOT NULL DEFAULT 'platform',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);

	return { db, sqlite };
}

function insertQuote(
	db: ReturnType<typeof drizzle>,
	{
		workflowId,
		applicantId = 1,
		status = "pending_signature",
		createdAt,
	}: {
		workflowId: number;
		applicantId?: number;
		status?: "draft" | "pending_approval" | "pending_signature" | "approved" | "rejected";
		createdAt: number;
	}
) {
	db.run(sql`
		INSERT INTO quotes (
			applicant_id,
			workflow_id,
			amount,
			base_fee_percent,
			status,
			generated_by,
			created_at,
			updated_at
		) VALUES (
			${applicantId},
			${workflowId},
			100000,
			150,
			${status},
			'platform',
			${createdAt},
			${createdAt}
		)
	`);
}

function installImmediateTimeouts() {
	const originalSetTimeout = globalThis.setTimeout;

	globalThis.setTimeout = ((handler: TimerHandler, _timeout?: number, ...args: unknown[]) => {
		queueMicrotask(() => {
			if (typeof handler === "function") {
				handler(...(args as []));
			}
		});

		return 0 as ReturnType<typeof setTimeout>;
	}) as typeof setTimeout;

	return () => {
		globalThis.setTimeout = originalSetTimeout;
	};
}

describe("signed quotation workflow service", () => {
	beforeEach(() => {
		inngestSendMock.mockReset();
		inngestSendMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		globalThis.setTimeout = setTimeout;
	});

	it("updates the latest quote and emits responded + signed events for approvals", async () => {
		const { db, sqlite } = createTestDb();

		try {
			insertQuote(db, {
				workflowId: 42,
				applicantId: 9,
				status: "pending_signature",
				createdAt: 100,
			});
			insertQuote(db, {
				workflowId: 42,
				applicantId: 9,
				status: "pending_signature",
				createdAt: 200,
			});

			const result = await syncSignedQuotationDecisionToQuoteAndInngest(
				db as never,
				42,
				9,
				"APPROVED"
			);

			expect(result).toEqual({ ok: true, quoteId: 2 });
			expect(inngestSendMock).toHaveBeenCalledTimes(2);
			expect(inngestSendMock).toHaveBeenNthCalledWith(1, {
				name: "quote/responded",
				data: expect.objectContaining({
					workflowId: 42,
					applicantId: 9,
					quoteId: 2,
					decision: "APPROVED",
				}),
			});
			expect(inngestSendMock).toHaveBeenNthCalledWith(2, {
				name: "quote/signed",
				data: expect.objectContaining({
					workflowId: 42,
					applicantId: 9,
					quoteId: 2,
				}),
			});

			const updatedQuotes = db.select().from(quotes).orderBy(quotes.id).all();
			expect(updatedQuotes[0]?.status).toBe("pending_signature");
			expect(updatedQuotes[1]?.status).toBe("approved");
		} finally {
			sqlite.close();
		}
	});

	it("marks the latest quote rejected and skips quote/signed on declines", async () => {
		const { db, sqlite } = createTestDb();

		try {
			insertQuote(db, {
				workflowId: 77,
				applicantId: 15,
				status: "pending_signature",
				createdAt: 300,
			});

			const result = await syncSignedQuotationDecisionToQuoteAndInngest(
				db as never,
				77,
				15,
				"DECLINED",
				"Missing signature"
			);

			expect(result).toEqual({ ok: true, quoteId: 1 });
			expect(inngestSendMock).toHaveBeenCalledTimes(1);
			expect(inngestSendMock).toHaveBeenCalledWith({
				name: "quote/responded",
				data: expect.objectContaining({
					workflowId: 77,
					applicantId: 15,
					quoteId: 1,
					decision: "DECLINED",
					reason: "Missing signature",
				}),
			});

			const [updatedQuote] = db
				.select()
				.from(quotes)
				.where(eq(quotes.id, 1))
				.all();

			expect(updatedQuote?.status).toBe("rejected");
		} finally {
			sqlite.close();
		}
	});

	it("returns no_quote without sending events when the workflow has no quote", async () => {
		const { db, sqlite } = createTestDb();

		try {
			const result = await syncSignedQuotationDecisionToQuoteAndInngest(
				db as never,
				999,
				21,
				"APPROVED"
			);

			expect(result).toEqual({ ok: false, error: "no_quote" });
			expect(inngestSendMock).not.toHaveBeenCalled();
		} finally {
			sqlite.close();
		}
	});

	it("retries transient Inngest send failures before succeeding", async () => {
		const restoreTimeouts = installImmediateTimeouts();

		try {
			inngestSendMock.mockRejectedValueOnce(new Error("temporary-1"));
			inngestSendMock.mockRejectedValueOnce(new Error("temporary-2"));
			inngestSendMock.mockResolvedValueOnce(undefined);

			await expect(
				sendInngestEventReliably({
					name: "quote/responded",
					data: { workflowId: 88, applicantId: 13 },
				})
			).resolves.toBeUndefined();

			expect(inngestSendMock).toHaveBeenCalledTimes(3);
		} finally {
			restoreTimeouts();
		}
	});
});
