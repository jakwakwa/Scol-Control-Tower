#!/usr/bin/env bun
/**
 * Drops every table in the Turso DB — including Drizzle's internal migration
 * tracking table. Run this before applying a squashed migration from scratch.
 *
 * Usage: bun run scripts/drop-all-tables.ts
 */

import "../envConfig";
import { dropAllLibsqlObjects } from "./libsql-drop-all";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_GROUP_AUTH_TOKEN;

if (!url) {
	console.error("❌ DATABASE_URL is not defined");
	process.exit(1);
}

dropAllLibsqlObjects(url, authToken, "dev")
	.then(() => {
		console.info("✅ Done.");
	})
	.catch(err => {
		console.error("❌ Failed:", err);
		process.exit(1);
	});
