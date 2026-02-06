import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load test environment variables.
// `override: true` ensures .env.test values win over empty/placeholder
// env vars that CI runners may inject from unconfigured secrets.
config({ path: resolve(__dirname, ".env.test"), override: true });

/**
 * Playwright Configuration for StratCol Control Tower
 * Configured for Clerk testing with @clerk/testing package
 * @see https://playwright.dev/docs/test-configuration
 * @see https://clerk.com/docs/guides/development/testing/playwright
 */
export default defineConfig({
	testDir: "./e2e/tests",

	/* Run tests in files in parallel */
	fullyParallel: true,

	/* Fail the build on CI if you accidentally left test.only in the source code */
	forbidOnly: !!process.env.CI,

	/* Retry failed tests on CI only */
	retries: process.env.CI ? 2 : 0,

	/* Opt out of parallel tests on CI for stability */
	workers: process.env.CI ? 1 : undefined,

	/* Reporter configuration */
	reporter: [["html", { open: "never" }], ["list"]],

	/* Shared settings for all projects */
	use: {
		/* Base URL for navigation */
		baseURL: "http://localhost:3000",

		/* Collect trace on first retry */
		trace: "on-first-retry",

		/* Screenshot on failure */
		screenshot: "only-on-failure",

		/* Video on failure */
		video: "on-first-retry",
	},

	/* Configure projects for major browsers */
	projects: [
		/* Global setup - initialize Clerk testing and create auth state */
		{
			name: "global setup",
			testMatch: /global\.setup\.ts/,
		},
		/* Main tests - tests that handle their own auth */
		{
			name: "app tests",
			testMatch: /app\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
			},
			dependencies: ["global setup"],
		},
		/* Authenticated tests - use saved auth state */
		{
			name: "authenticated tests",
			testMatch: /.*\.authenticated\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				// Use prepared Clerk auth state
				storageState: "playwright/.clerk/user.json",
			},
			dependencies: ["global setup"],
		},
		/* Dashboard tests - use saved auth state */
		{
			name: "dashboard tests",
			testMatch: /dashboard\/.*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				// Use prepared Clerk auth state
				storageState: "playwright/.clerk/user.json",
			},
			dependencies: ["global setup"],
		},
		/* Workflow / SOP tests - use saved auth state */
		{
			name: "workflow tests",
			testMatch: /workflow\/.*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				storageState: "playwright/.clerk/user.json",
			},
			dependencies: ["global setup"],
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: "bun run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
});