#!/usr/bin/env bun

type NetworkCheckResponse = {
	ok: boolean;
	environment?: string;
	baseUrl?: string;
	egressOwner?: string;
	observedPublicIp?: string | null;
	tokenIssued?: boolean;
	vendorsGetListOk?: boolean;
	listedRecords?: number;
	error?: string;
	checkedAt?: string;
};

function writeStdout(line: string): void {
	process.stdout.write(`${line}\n`);
}

function writeStderr(line: string): void {
	process.stderr.write(`${line}\n`);
}

function getRequiredAuthToken(): string {
	const token = process.env.GAS_WEBHOOK_SECRET || process.env.CRON_SECRET;
	if (!token) {
		throw new Error(
			"Missing GAS_WEBHOOK_SECRET or CRON_SECRET. Set one before running this check."
		);
	}
	return token;
}

function getBaseAppUrl(): string {
	const raw =
		process.env.PROCURECHECK_CHECK_APP_URL ||
		process.env.NEXT_PUBLIC_APP_URL ||
		"http://localhost:3000";
	return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function main() {
	const authToken = getRequiredAuthToken();
	const appBaseUrl = getBaseAppUrl();
	const targetUrl = `${appBaseUrl}/api/integrations/procurecheck/network-check`;

	writeStdout(`Calling: ${targetUrl}`);

	const response = await fetch(targetUrl, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});

	const result = (await response.json()) as NetworkCheckResponse;
	writeStdout(JSON.stringify(result, null, 2));

	if (!(response.ok && result.ok)) {
		throw new Error(
			`ProcureCheck network check failed (${response.status}): ${result.error ?? "unknown error"}`
		);
	}
}

if (import.meta.main) {
	main().catch(error => {
		const message = error instanceof Error ? error.message : "Unknown error";
		writeStderr(message);
		process.exit(1);
	});
}
