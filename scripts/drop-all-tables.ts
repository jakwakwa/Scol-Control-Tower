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

async function dropAll() {
	await client.execute("PRAGMA foreign_keys = OFF");

	const objects = await client.execute(
		"SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'"
	);

	for (const row of objects.rows) {
		if (typeof row.name !== "string" || typeof row.type !== "string") {
			continue;
		}

		const keyword = row.type === "view" ? "VIEW" : "TABLE";
		await client.execute(`DROP ${keyword} IF EXISTS "${row.name}"`);
	}

	await client.execute("PRAGMA foreign_keys = ON");
	client.close();
}

dropAll().catch(err => {
	console.error("❌ Failed:", err);
	process.exit(1);
});
