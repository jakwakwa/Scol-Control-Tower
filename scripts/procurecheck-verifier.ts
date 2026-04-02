#!/usr/bin/env bun
/**
 * ProcureCheck Web API v5 Prebuilt Local Verifier
 *
 * Run this script before your meeting to verify connectivity and API flow.
 * It demonstrates the JWT auth flow for the Web API v5 (distinct from ITC credit).
 *
 * Usage:
 *   bun run scripts/procurecheck-verifier.ts
 *
 * Requires:
 *   PROCURECHECK_USERNAME
 *   PROCURECHECK_PASSWORD
 *   PROCURECHECK_BASE_URL (optional, defaults to xdev)
 *
 * See lib/procurecheck.ts for the implementation.
 */

import { runMeetingDemo } from "../lib/procurecheck-demo";

function writeStdout(line: string): void {
	process.stdout.write(`${line}\n`);
}

function writeStderr(line: string): void {
	process.stderr.write(`${line}\n`);
}

async function main() {
	const includeCreate = process.argv.includes("--create") || process.argv.includes("-c");
	const outputJson = process.argv.includes("--json");

	if (!outputJson) {
		writeStdout("ProcureCheck preflight check starting...");
		writeStdout(`Create vendor flow enabled: ${includeCreate ? "yes" : "no"}`);
	}

	const result = await runMeetingDemo(includeCreate);

	if (outputJson) {
		writeStdout(JSON.stringify(result, null, 2));
		if (!result.success) {
			process.exit(1);
		}
		return;
	}

	if (result.success) {
		writeStdout("ProcureCheck preflight passed.");
		writeStdout(`Base URL: ${result.baseUrl}`);
		writeStdout(`Egress owner: ${result.egressOwner}`);
		writeStdout(`Vendors fetched: ${result.listedRecords}`);
		if (includeCreate) {
			writeStdout(`Created vendor ID: ${result.createdVendorId ?? "not returned"}`);
			writeStdout(`Failed checks from summary: ${result.failedChecks ?? "not returned"}`);
		}
	} else {
		writeStderr("ProcureCheck preflight failed.");
		writeStderr(result.error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch(err => {
		const message = err instanceof Error ? err.message : String(err);
		writeStderr(`Fatal error: ${message}`);
		process.exit(1);
	});
}
