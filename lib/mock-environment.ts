export type DatabaseTarget = "primary" | "test" | "mock";

export interface ResolvedDatabaseConfig {
	target: DatabaseTarget;
	url: string | null;
	error?: string;
}

function isEnabled(value?: string): boolean {
	if (!value) {
		return false;
	}

	const normalized = value.trim().toLowerCase();
	return normalized === "true" || normalized === "1";
}

function getRuntimeEnvironment(): string | null {
	return process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? null;
}

export function isLocalMockEnvironmentEnabled(): boolean {
	return isEnabled(process.env.ENABLE_LOCAL_MOCK_ENV);
}

export function isDevMockEnvironmentEnabled(): boolean {
	if (!isEnabled(process.env.ENABLE_DEV_MOCK_ENV)) {
		return false;
	}

	const runtimeEnvironment = getRuntimeEnvironment();
	if (runtimeEnvironment === "production") {
		return false;
	}

	if (runtimeEnvironment === "preview" || runtimeEnvironment === "development") {
		return true;
	}

	return process.env.NODE_ENV !== "production";
}

export function isMockEnvironmentEnabled(): boolean {
	return isLocalMockEnvironmentEnabled() || isDevMockEnvironmentEnabled();
}

export function resolveDatabaseConfig(): ResolvedDatabaseConfig {
	if (process.env.E2E_USE_TEST_DB === "1") {
		return {
			target: "test",
			url: process.env.TEST_DATABASE_URL ?? null,
			error: process.env.TEST_DATABASE_URL ? undefined : "TEST_DATABASE_URL is not defined",
		};
	}

	if (isMockEnvironmentEnabled()) {
		return {
			target: "mock",
			url: process.env.MOCK_DATABASE_URL ?? null,
			error: process.env.MOCK_DATABASE_URL ? undefined : "MOCK_DATABASE_URL is not defined",
		};
	}

	return {
		target: "primary",
		url: process.env.DATABASE_URL ?? null,
		error: process.env.DATABASE_URL ? undefined : "DATABASE_URL is not defined",
	};
}

export function resolveRequiredDatabaseUrl(target: Extract<DatabaseTarget, "primary" | "test" | "mock">): string {
	const envName =
		target === "test"
			? "TEST_DATABASE_URL"
			: target === "mock"
				? "MOCK_DATABASE_URL"
				: "DATABASE_URL";
	const value = process.env[envName];

	if (!value) {
		throw new Error(`${envName} is not defined`);
	}

	return value;
}