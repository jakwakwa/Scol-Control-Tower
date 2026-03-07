#!/usr/bin/env bun
/**
 * Drops every table in the Turso DB — including Drizzle's internal migration
 * tracking table. Run this before applying a squashed migration from scratch.
 *
 * Usage: bun run scripts/drop-all-tables.ts
 */

import "../envConfig";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;

if (!url) {
	console.error("❌ DATABASE_URL is not defined");
	process.exit(1);
}

const client = createClient({ url, authToken });

const TABLES = [
	// Leaf tables first (most FK dependencies)
	"signatures",
	"internal_submissions",
	"document_uploads",
	"ai_feedback_logs",
	"ai_analysis_logs",
	"sanction_clearance",
	"agent_callbacks",
	"xt_callbacks",
	"applicant_submissions",
	"applicant_magiclink_forms",
	"quotes",
	"workflow_events",
	"notifications",
	"activity_logs",
	"risk_assessments",
	"documents",
	"internal_forms",
	"workflows",
	"applicants",
	"agents",
	"todos",
	// Drizzle internal migration tracking
	"__drizzle_migrations",
];

async function dropAll() {
	// Disable FK enforcement so we can drop in any order
	await client.execute("PRAGMA foreign_keys = OFF");

	for (const table of TABLES) {
		try {
			await client.execute(`DROP TABLE IF EXISTS \`${table}\``);
		} catch (err) {
			console.warn(`  ⚠ could not drop ${table}:`, (err as Error).message);
		}
	}

	await client.execute("PRAGMA foreign_keys = ON");
}

dropAll().catch(err => {
	console.error("❌ Failed:", err);
	process.exit(1);
});
