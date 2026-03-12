import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

/**
 * App Tests - Sign in/out functionality
 * These tests verify basic authentication flows
 */
test.describe("Authentication", () => {
	test("should sign in successfully and access dashboard", async ({ page }) => {
		// Navigate to an unprotected page that loads Clerk
		await page.goto("/");

		// Sign in using Clerk test helper
		await clerk.signIn({
			page,
			signInParams: {
				strategy: "password",
				identifier: process.env.E2E_CLERK_USER_USERNAME ?? process.env.E2E_CLERK_USER_EMAIL!,
				password: process.env.E2E_CLERK_USER_PASSWORD!,
			},
		});

		// Use lighter route to prove auth (form page vs data-heavy dashboard)
		await page.goto("/dashboard/applicants/new", {
			waitUntil: "domcontentloaded",
			timeout: 60_000,
		});

		// Verify we're authenticated and on the form
		await expect(page).toHaveURL(/\/dashboard\/applicants\/new/);
		await expect(page.locator("#companyName")).toBeVisible();
	});

	test("should sign out successfully", async ({ page }) => {
		// Navigate to an unprotected page that loads Clerk
		await page.goto("/");

		// Sign in first
		await clerk.signIn({
			page,
			signInParams: {
				strategy: "password",
				identifier: process.env.E2E_CLERK_USER_USERNAME ?? process.env.E2E_CLERK_USER_EMAIL!,
				password: process.env.E2E_CLERK_USER_PASSWORD!,
			},
		});

		// Use lighter route to prove auth
		await page.goto("/dashboard/applicants/new", {
			waitUntil: "domcontentloaded",
			timeout: 60_000,
		});
		await expect(page.locator("#companyName")).toBeVisible();

		// Sign out
		await clerk.signOut({ page });

		// Try to access dashboard - should redirect to sign-in
		await page.goto("/dashboard");
		await expect(page).toHaveURL(/sign-in/);
	});
});
