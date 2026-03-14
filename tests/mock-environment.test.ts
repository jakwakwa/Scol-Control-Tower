import { afterEach, describe, expect, it } from "bun:test";
import {
	isDevMockEnvironmentEnabled,
	isLocalMockEnvironmentEnabled,
	isMockEnvironmentEnabled,
	resolveDatabaseConfig,
} from "@/lib/mock-environment";

const ORIGINAL_ENV = { ...process.env };
const RESET_KEYS = [
	"E2E_USE_TEST_DB",
	"TEST_DATABASE_URL",
	"DATABASE_URL",
	"MOCK_DATABASE_URL",
	"ENABLE_LOCAL_MOCK_ENV",
	"ENABLE_DEV_MOCK_ENV",
	"VERCEL_ENV",
	"NEXT_PUBLIC_VERCEL_ENV",
	"NODE_ENV",
] as const;

function resetEnv() {
	for (const key of RESET_KEYS) {
		const originalValue = ORIGINAL_ENV[key];
		process.env[key] = originalValue;
	}
}

afterEach(() => {
	resetEnv();
});

describe("mock environment resolver", () => {
	it("defaults to primary database when flags are absent", () => {
		process.env.DATABASE_URL = "postgresql://primary";

		expect(isLocalMockEnvironmentEnabled()).toBe(false);
		expect(isDevMockEnvironmentEnabled()).toBe(false);
		expect(isMockEnvironmentEnabled()).toBe(false);
		expect(resolveDatabaseConfig()).toEqual({
			target: "primary",
			url: "postgresql://primary",
			error: undefined,
		});
	});

	it("keeps E2E test database highest priority", () => {
		process.env.E2E_USE_TEST_DB = "1";
		process.env.TEST_DATABASE_URL = "postgresql://test";
		process.env.MOCK_DATABASE_URL = "postgresql://mock";
		process.env.ENABLE_LOCAL_MOCK_ENV = "true";

		expect(resolveDatabaseConfig()).toEqual({
			target: "test",
			url: "postgresql://test",
			error: undefined,
		});
	});

	it("uses mock database only when local mock flag is enabled", () => {
		process.env.DATABASE_URL = "postgresql://primary";
		process.env.MOCK_DATABASE_URL = "postgresql://mock";
		process.env.ENABLE_LOCAL_MOCK_ENV = "true";

		expect(isMockEnvironmentEnabled()).toBe(true);
		expect(resolveDatabaseConfig()).toEqual({
			target: "mock",
			url: "postgresql://mock",
			error: undefined,
		});
	});

	it("allows dev mock mode in preview deployments only when enabled", () => {
		process.env.DATABASE_URL = "postgresql://primary";
		process.env.MOCK_DATABASE_URL = "postgresql://mock";
		process.env.ENABLE_DEV_MOCK_ENV = "true";
		process.env.VERCEL_ENV = "preview";

		expect(isDevMockEnvironmentEnabled()).toBe(true);
		expect(resolveDatabaseConfig().target).toBe("mock");
	});

	it("refuses dev mock mode in production even when enabled", () => {
		process.env.DATABASE_URL = "postgresql://primary";
		process.env.MOCK_DATABASE_URL = "postgresql://mock";
		process.env.ENABLE_DEV_MOCK_ENV = "true";
		process.env.VERCEL_ENV = "production";

		expect(isDevMockEnvironmentEnabled()).toBe(false);
		expect(resolveDatabaseConfig().target).toBe("primary");
	});

	it("fails closed when mock mode is enabled without a mock database url", () => {
		process.env.ENABLE_LOCAL_MOCK_ENV = "true";
		process.env.DATABASE_URL = "postgresql://primary";

		expect(resolveDatabaseConfig()).toEqual({
			target: "mock",
			url: null,
			error: "MOCK_DATABASE_URL is not defined",
		});
	});
});