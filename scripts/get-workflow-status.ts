#!/usr/bin/env bun
/**
 * get-workflow-status.ts — print latest workflow stage+status for an applicant.
 * Used by verify-refactor.sh to poll for workflow progress.
 *
 * Usage: bun run scripts/get-workflow-status.ts <applicantId>
 * Output: {"stage":4,"status":"awaiting_human"} (or {"stage":null,"status":null})
 */
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { workflows } from "../db/schema";

const root = process.cwd();
config({ path: resolve(root, ".env.test") });
config({ path: resolve(root, ".env.local"), override: true });

const applicantId = Number(process.argv[2]);
if (!applicantId || Number.isNaN(applicantId)) {
	process.stdout.write(JSON.stringify({ stage: null, status: null }));
	process.exit(0);
}

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const authToken =
	process.env.TEST_TURSO_GROUP_AUTH_TOKEN ?? process.env.TURSO_GROUP_AUTH_TOKEN;

if (!url) {
	process.stdout.write(JSON.stringify({ stage: null, status: null, error: "no db url" }));
	process.exit(0);
}

const client = createClient({ url, authToken });
const db = drizzle(client);

try {
	const rows = await db
		.select({ stage: workflows.stage, status: workflows.status })
		.from(workflows)
		.where(eq(workflows.applicantId, applicantId))
		.orderBy(desc(workflows.id))
		.limit(1);

	const row = rows[0];
	process.stdout.write(
		JSON.stringify({ stage: row?.stage ?? null, status: row?.status ?? null })
	);
} finally {
	client.close();
}
