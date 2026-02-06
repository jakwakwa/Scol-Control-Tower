/**
 * Auth Setup - Generates authenticated state for tests
 *
 * This runs once before all tests to create auth state.
 */
import { test as setup, expect } from "@playwright/test";
import { resolve } from "node:path";

const authFile = resolve(__dirname, "../.auth/user.json");

setup("authenticate", async ({ page, context }) => {
	// For bypass auth pattern: set test mode cookies
	await context.addCookies([
		{
			name: "__e2e_test_mode",
			value: "true",
			domain: "localhost",
			path: "/",
		},
		{
			name: "__e2e_user_id",
			value: process.env.E2E_TEST_USER_ID || "user_test_001",
			domain: "localhost",
			path: "/",
		},
		{
			name: "__e2e_user_email",
			value: process.env.E2E_TEST_USER_EMAIL || "test@stratcol.co.za",
			domain: "localhost",
			path: "/",
		},
	]);

	// Navigate to dashboard to verify auth works
	await page.goto("/dashboard");

	// Save auth state for other tests to reuse
	await context.storageState({ path: authFile });
});
