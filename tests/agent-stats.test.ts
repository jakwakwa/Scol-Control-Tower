import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { IDENTITY_DOCUMENT_TYPES_FOR_STATS } from "@/lib/services/agent-stats";

/**
 * Financial-risk stats use SQLite `json_extract(raw_output, '$.available')`.
 * Validate the same semantics LibSQL/Turso uses for persisted JSON strings.
 */
describe("agent-stats SQLite JSON semantics", () => {
	const db = new Database(":memory:");

	it("treats available true as 1 for equality filter", () => {
		const raw = JSON.stringify({ available: true, overall: { score: 50 } });
		const row = db
			.query<{ ok: number }, [string]>(
				"SELECT json_extract(?1, '$.available') = 1 AS ok"
			)
			.get(raw);
		expect(row?.ok).toBe(1);
	});

	it("treats available false as 0 for equality filter", () => {
		const raw = JSON.stringify({ available: false, reason: "x" });
		const row = db
			.query<{ ok: number }, [string]>(
				"SELECT json_extract(?1, '$.available') = 0 AS ok"
			)
			.get(raw);
		expect(row?.ok).toBe(1);
	});
});

describe("IDENTITY_DOCUMENT_TYPES_FOR_STATS", () => {
	it("matches Inngest id-verification auto-verify filter list", () => {
		expect([...IDENTITY_DOCUMENT_TYPES_FOR_STATS]).toEqual([
			"ID_DOCUMENT",
			"PROPRIETOR_ID",
			"DIRECTOR_ID",
			"FICA_ID",
		]);
	});
});
