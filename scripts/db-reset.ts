#!/usr/bin/env bun
/**
 * Drops all objects on the dev Turso DB (DATABASE_URL), applies migrations,
 * then — if `.env.test` defines TEST_DATABASE_URL — does the same for the E2E test DB.
 *
 * Usage: bun run db:reset
 */
import "../envConfig";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

import { dropAllLibsqlObjects } from "./libsql-drop-all";

const devUrl = process.env.DATABASE_URL;
const devToken = process.env.TURSO_GROUP_AUTH_TOKEN;

if (!devUrl) {
	console.error("❌ DATABASE_URL is not defined");
	process.exit(1);
}

async function main() {
	await dropAllLibsqlObjects(devUrl, devToken, "dev");
	console.info("📦 Applying migrations (dev)...");
	execSync("bun run db:migrate", {
		stdio: "inherit",
		cwd: process.cwd(),
		env: process.env,
	});

	const envTestPath = resolve(process.cwd(), ".env.test");
	if (!existsSync(envTestPath)) {
		console.info("ℹ️  No .env.test — skipping test database reset.");
		return;
	}

	config({ path: envTestPath });

	const testUrl = process.env.TEST_DATABASE_URL;
	if (!testUrl) {
		console.info(
			"ℹ️  TEST_DATABASE_URL not set in .env.test — skipping test database reset."
		);
		return;
	}

	const testToken = process.env.TEST_TURSO_GROUP_AUTH_TOKEN;

	await dropAllLibsqlObjects(testUrl, testToken, "test");
	console.info("📦 Applying migrations (test)...");
	execSync("bun run db:migrate:test", {
		stdio: "inherit",
		cwd: process.cwd(),
		env: process.env,
	});

	console.info("✅ Dev and test databases reset (drop all + migrations applied).");
}

main().catch(err => {
	console.error("❌ Failed:", err);
	process.exit(1);
});
