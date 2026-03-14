#!/usr/bin/env bun

import "../envConfig";
import { spawn } from "node:child_process";

const DEFAULT_MOCK_DATABASE_URL =
	"postgresql://postgres:postgres@localhost:5434/controltower_mock";

function run(command: string, args: string[], env?: Record<string, string>) {
	return new Promise<number | null>((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: process.cwd(),
			stdio: "inherit",
			env: {
				...process.env,
				...env,
			},
		});

		child.on("error", reject);
		child.on("exit", code => resolve(code));
	});
}

async function main() {
	const mockDatabaseUrl = process.env.MOCK_DATABASE_URL || DEFAULT_MOCK_DATABASE_URL;
	const inngestBaseUrl = process.env.INNGEST_BASE_URL || "http://localhost:8288";
	const inngestDevServerUrl =
		process.env.INNGEST_DEV_SERVER_URL || "http://host.docker.internal:3000/api/inngest";

	console.info("🚀 Starting local mock manual-testing environment...");
	console.info(`Using mock DB: ${mockDatabaseUrl}`);
	console.info(`Using Inngest base URL: ${inngestBaseUrl}`);
	console.info(`Inngest dev target URL: ${inngestDevServerUrl}`);

	let exitCode = await run("docker", ["compose", "up", "-d", "mock_db"]);
	if (exitCode !== 0) {
		process.exit(exitCode ?? 1);
	}

	exitCode = await run("docker", ["compose", "up", "-d", "inngest"], {
		INNGEST_DEV_SERVER_URL: inngestDevServerUrl,
	});
	if (exitCode !== 0) {
		process.exit(exitCode ?? 1);
	}

	exitCode = await run("bun", ["run", "mock:db:bootstrap"], {
		MOCK_DATABASE_URL: mockDatabaseUrl,
	});
	if (exitCode !== 0) {
		process.exit(exitCode ?? 1);
	}

	exitCode = await run("bun", ["run", "mock:db:verify"], {
		MOCK_DATABASE_URL: mockDatabaseUrl,
	});
	if (exitCode !== 0) {
		process.exit(exitCode ?? 1);
	}

	console.info("🌐 Launching Next.js dev server with mock DB enabled...");
	console.info("Stop this process with Ctrl+C when manual testing is finished.");

	exitCode = await run("bun", ["run", "dev"], {
		ENABLE_LOCAL_MOCK_ENV: "true",
		MOCK_DATABASE_URL: mockDatabaseUrl,
		INNGEST_BASE_URL: inngestBaseUrl,
	});

	process.exit(exitCode ?? 0);
}

main().catch(error => {
	console.error("❌ Failed to start local mock manual-testing environment:", error);
	process.exit(1);
});
