#!/usr/bin/env bun
/**
 * Reset the E2E test database (Turso) using the same migration SQL as dev.
 * Loads .env.test only (not .env.local) so TEST_* vars are used.
 *
 * Usage: bun run test:db:reset
 *
 * For dev + test in one go, use `bun run db:reset` (applies migrations to both
 * when `.env.test` defines TEST_DATABASE_URL).
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";

import { dropAllLibsqlObjects } from "./libsql-drop-all";

config({ path: resolve(process.cwd(), ".env.test"), override: true });

const url = process.env.TEST_DATABASE_URL;
const authToken = process.env.TEST_TURSO_GROUP_AUTH_TOKEN;

if (!url) {
	console.error("❌ TEST_DATABASE_URL is not defined in .env.test");
	console.error("   Copy .env.test.example to .env.test and add your test database URL.");
	process.exit(1);
}

async function reset() {
	await dropAllLibsqlObjects(url, authToken, "test");

	console.info("📦 Applying migrations (test)...");
	execSync("bun run db:migrate:test", {
		stdio: "inherit",
		cwd: process.cwd(),
		env: process.env,
	});

	console.info("✅ Test database reset complete (drop all + migrations applied).");
}

reset().catch(err => {
	console.error("❌ Failed:", err);
	process.exit(1);
});
