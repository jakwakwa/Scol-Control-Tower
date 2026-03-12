#!/usr/bin/env bun
/**
 * Reset the E2E test database (Turso).
 * Loads .env.test only (not .env.local) so TEST_* vars are used.
 *
 * Usage: bun run test:db:reset
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

// Load .env.test only — avoid .env.local so we use the test database
config({ path: resolve(process.cwd(), ".env.test"), override: true });

const url = process.env.TEST_DATABASE_URL;
const authToken = process.env.TEST_TURSO_GROUP_AUTH_TOKEN;

if (!url) {
	console.error("❌ TEST_DATABASE_URL is not defined in .env.test");
	console.error("   Copy .env.test.example to .env.test and add your test database URL.");
	process.exit(1);
}

const { createClient } = await import("@libsql/client");
const client = createClient({ url, authToken });

async function reset() {
	console.info("🧹 Resetting test database...");

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

	// Run migrations against test DB (uses drizzle.test.config.ts)
	execSync("bun run db:migrate:test", {
		stdio: "inherit",
		cwd: process.cwd(),
	});

	console.info("✅ Test database reset complete");
}

reset().catch(err => {
	console.error("❌ Failed:", err);
	process.exit(1);
});
