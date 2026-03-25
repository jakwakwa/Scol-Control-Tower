#!/usr/bin/env bun
import { resolve } from "node:path";
import { config } from "dotenv";

/**
 * Run before browser-flow scripts: same env layering as dev:browser-flow
 * (.env.test then .env.local so Clerk keys always match the dashboard instance).
 */

const root = process.cwd();
config({ path: resolve(root, ".env.test") });
config({ path: resolve(root, ".env.local"), override: true });

function requireEnv(label: string, value: string | undefined): void {
	if (value === undefined || String(value).trim() === "") {
		console.error(`browser-flow preflight: missing ${label}`);
		process.exit(1);
	}
}

requireEnv("TEST_DATABASE_URL", process.env.TEST_DATABASE_URL);
requireEnv("TEST_TURSO_GROUP_AUTH_TOKEN", process.env.TEST_TURSO_GROUP_AUTH_TOKEN);
requireEnv("CLERK_SECRET_KEY", process.env.CLERK_SECRET_KEY);
requireEnv(
	"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
	process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

const amUser =
	process.env.E2E_CLERK_AM_USERNAME ?? process.env.E2E_CLERK_RISKMANAGER_USERNAME;
const amPass =
	process.env.E2E_CLERK_AM_PASSWORD ?? process.env.E2E_CLERK_RISKMANAGER_PASSWORD;
requireEnv("E2E_CLERK_AM_USERNAME (or E2E_CLERK_RISKMANAGER_USERNAME)", amUser);
requireEnv("E2E_CLERK_AM_PASSWORD (or E2E_CLERK_RISKMANAGER_PASSWORD)", amPass);

const riskUser =
	process.env.E2E_CLERK_RISKMANAGER_USERNAME ??
	process.env.E2E_CLERK_RISK_MANAGER_USERNAME ??
	process.env.E2E_CLERK_USER_USERNAME;
const riskPass =
	process.env.E2E_CLERK_RISKMANAGER_PASSWORD ??
	process.env.E2E_CLERK_RISK_MANAGER_PASSWORD ??
	process.env.E2E_CLERK_USER_PASSWORD;
requireEnv("E2E_CLERK_RISKMANAGER_USERNAME (or E2E_CLERK_USER_USERNAME)", riskUser);
requireEnv("E2E_CLERK_RISKMANAGER_PASSWORD (or E2E_CLERK_USER_PASSWORD)", riskPass);

const port = process.env.BROWSER_FLOW_PORT ?? "3100";
const base =
	process.env.BROWSER_FLOW_BASE_URL?.replace(/\/$/, "") ?? `http://localhost:${port}`;

try {
	const res = await fetch(`${base}/sign-in`, {
		method: "GET",
		redirect: "manual",
		signal: AbortSignal.timeout(8000),
	});
	if (res.status >= 500) {
		console.error(
			`browser-flow preflight: ${base}/sign-in returned HTTP ${res.status}. Is dev:browser-flow running?`
		);
		process.exit(1);
	}
} catch (err) {
	console.error(
		`browser-flow preflight: cannot reach ${base}/sign-in (run \`bun run dev:browser-flow\` in another terminal).`
	);
	console.error(String(err instanceof Error ? err.message : err));
	process.exit(1);
}

process.stdout.write(
	`browser-flow preflight: OK (app ${base}, test DB + Clerk keys loaded)\n`
);
