/**
 * Authentication Tests
 *
 * Verifies auth flow and protected route behavior.
 */
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
	test("should redirect unauthenticated users from dashboard", async ({ page }) => {
		// Try to access protected route without auth
		await page.goto("/dashboard");

		// Should be redirected to sign-in
		await expect(page).toHaveURL(/.*sign-in/);
	});

	test("should allow access to public landing page", async ({ page }) => {
		await page.goto("/");

		// Should stay on landing page
		await expect(page).toHaveURL("/");
	});

	test("should allow access to sign-in page", async ({ page }) => {
		await page.goto("/sign-in");

		// Should load sign-in page
		await expect(page).toHaveURL(/.*sign-in/);
	});
});
