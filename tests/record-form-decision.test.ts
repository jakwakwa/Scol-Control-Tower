/**
 * Unit test: recordFormDecision must handle NULL decisionStatus correctly.
 *
 * Root cause of the wait-quote-response bug:
 * SQLite evaluates `NULL != 'responded'` as NULL (not TRUE),
 * so the UPDATE WHERE clause matched zero rows when decisionStatus was NULL.
 */
import { Database } from "bun:sqlite";
import { describe, expect, it, beforeEach } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sql, } from "drizzle-orm";
import { applicantMagiclinkForms, } from "../db/schema.ts";

// We need to mock getDatabaseClient to use our in-memory DB.
// Since recordFormDecision calls getDatabaseClient() internally,
// we test the SQL logic directly via drizzle on an in-memory SQLite DB.

function createTestDb() {
	const sqlite = new Database(":memory:");
	const db = drizzle(sqlite);

	// Create minimal tables needed
	db.run(sql`
		CREATE TABLE applicants (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			company_name TEXT NOT NULL DEFAULT 'Test',
			contact_name TEXT NOT NULL DEFAULT 'Test',
			email TEXT NOT NULL DEFAULT 'test@test.com',
			status TEXT NOT NULL DEFAULT 'new',
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			updated_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);

	db.run(sql`
		CREATE TABLE applicant_magiclink_forms (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			applicant_id INTEGER NOT NULL REFERENCES applicants(id),
			workflow_id INTEGER,
			form_type TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			token_hash TEXT NOT NULL UNIQUE,
			token TEXT,
			token_prefix TEXT,
			sent_at INTEGER,
			viewed_at INTEGER,
			expires_at INTEGER,
			submitted_at INTEGER,
			decision_status TEXT,
			decision_outcome TEXT,
			decision_reason TEXT,
			decision_at INTEGER,
			created_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);

	return db;
}

describe("recordFormDecision — NULL decisionStatus handling", () => {
	let db: ReturnType<typeof createTestDb>;
	let formInstanceId: number;

	beforeEach(() => {
		db = createTestDb();

		// Insert a test applicant
		db.run(sql`
			INSERT INTO applicants (company_name, contact_name, email, status)
			VALUES ('Test Co', 'Test User', 'test@example.com', 'new')
		`);

		// Insert a form instance with NULL decisionStatus (the bug scenario)
		db.run(sql`
			INSERT INTO applicant_magiclink_forms
				(applicant_id, form_type, status, token_hash, decision_status)
			VALUES (1, 'SIGNED_QUOTATION', 'submitted', 'hash123', NULL)
		`);

		formInstanceId = 1;
	});

	it("should update when decisionStatus is NULL (the bug scenario)", () => {
		// This is the exact SQL logic from recordFormDecision after the fix:
		// WHERE id = ? AND (decision_status IS NULL OR decision_status != 'responded')
		const result = db
			.update(applicantMagiclinkForms)
			.set({
				decisionStatus: "responded",
				decisionOutcome: "approved",
				decisionAt: new Date(),
			})
			.where(
				sql`${applicantMagiclinkForms.id} = ${formInstanceId}
					AND (${applicantMagiclinkForms.decisionStatus} IS NULL
						OR ${applicantMagiclinkForms.decisionStatus} != 'responded')`
			)
			.returning()
			.all();

		expect(result.length).toBe(1);
		expect(result[0].decisionStatus).toBe("responded");
		expect(result[0].decisionOutcome).toBe("approved");
	});

	it("should NOT update when decisionStatus is already 'responded' (dedup guard)", () => {
		// Pre-set to responded
		db.run(sql`
			UPDATE applicant_magiclink_forms
			SET decision_status = 'responded'
			WHERE id = ${formInstanceId}
		`);

		const result = db
			.update(applicantMagiclinkForms)
			.set({
				decisionStatus: "responded",
				decisionOutcome: "approved",
				decisionAt: new Date(),
			})
			.where(
				sql`${applicantMagiclinkForms.id} = ${formInstanceId}
					AND (${applicantMagiclinkForms.decisionStatus} IS NULL
						OR ${applicantMagiclinkForms.decisionStatus} != 'responded')`
			)
			.returning()
			.all();

		expect(result.length).toBe(0);
	});

	it("should update when decisionStatus is 'pending' (new default)", () => {
		// Set the new default
		db.run(sql`
			UPDATE applicant_magiclink_forms
			SET decision_status = 'pending'
			WHERE id = ${formInstanceId}
		`);

		const result = db
			.update(applicantMagiclinkForms)
			.set({
				decisionStatus: "responded",
				decisionOutcome: "declined",
				decisionReason: "Changed mind",
				decisionAt: new Date(),
			})
			.where(
				sql`${applicantMagiclinkForms.id} = ${formInstanceId}
					AND (${applicantMagiclinkForms.decisionStatus} IS NULL
						OR ${applicantMagiclinkForms.decisionStatus} != 'responded')`
			)
			.returning()
			.all();

		expect(result.length).toBe(1);
		expect(result[0].decisionStatus).toBe("responded");
		expect(result[0].decisionOutcome).toBe("declined");
	});

	it("demonstrates the old bug: bare != fails with NULL", () => {
		// This proves the original bug: using only != without IS NULL check
		const buggyResult = db
			.update(applicantMagiclinkForms)
			.set({
				decisionStatus: "responded",
				decisionOutcome: "approved",
				decisionAt: new Date(),
			})
			.where(
				sql`${applicantMagiclinkForms.id} = ${formInstanceId}
					AND ${applicantMagiclinkForms.decisionStatus} != 'responded'`
			)
			.returning()
			.all();

		// With NULL decisionStatus, this matches ZERO rows — the original bug
		expect(buggyResult.length).toBe(0);
	});
});
