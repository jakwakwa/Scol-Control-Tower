#!/usr/bin/env bun

import "../envConfig";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { resolveRequiredDatabaseUrl } from "@/lib/mock-environment";

const url = resolveRequiredDatabaseUrl("mock");

interface MigrationJournal {
	entries: Array<{ tag: string }>;
}

function getMigrationStatements(): string[] {
	const journalPath = join(process.cwd(), "migrations", "meta", "_journal.json");
	const journal = JSON.parse(readFileSync(journalPath, "utf8")) as MigrationJournal;

	return journal.entries.flatMap(entry => {
		const sqlPath = join(process.cwd(), "migrations", `${entry.tag}.sql`);
		const sql = readFileSync(sqlPath, "utf8");

		return sql
			.split("--> statement-breakpoint")
			.map(statement => statement.trim())
			.filter(Boolean);
	});
}

async function reset() {
	console.info("🧹 Resetting mock database...");
	const pool = new Pool({ connectionString: url });

	await pool.query("DROP SCHEMA public CASCADE;");
	await pool.query("CREATE SCHEMA public;");
	await pool.query("GRANT ALL ON SCHEMA public TO postgres;");
	await pool.query("GRANT ALL ON SCHEMA public TO public;");
	await pool.end();

	const migrationPool = new Pool({ connectionString: url });
	for (const statement of getMigrationStatements()) {
		await migrationPool.query(statement);
	}
	await migrationPool.end();

	console.info("✅ Mock database reset complete");
}

reset().catch(error => {
	console.error("❌ Failed to reset mock database:", error);
	process.exit(1);
});