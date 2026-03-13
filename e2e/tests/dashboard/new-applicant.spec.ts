/**
 * New Applicant Form E2E Test
 *
 * Tests the new applicant form flow in the dashboard.
 */
import { expect, test } from "@playwright/test";

test.describe("New Applicant Form", () => {
	test("should open form, fill inputs, and cancel", async ({ page }) => {
		// Navigate directly to form (avoids heavy dashboard + hydration timing)
		await page.goto("/dashboard/applicants/new");

		// Verify form is visible
		await expect(page).toHaveURL(/\/dashboard\/applicants\/new/);
		await expect(page.locator("#companyName")).toBeVisible();

		// Fill in the form fields
		await page.fill("#companyName", "E2E Test Company Pty Ltd");
		await page.getByRole("combobox", { name: "Entity Type" }).click();
		await page.getByRole("option", { name: "Company" }).click();
		await page.fill("#registrationNumber", "2024/999888/07");
		await page.fill("#contactName", "Test Contact Person");
		await page.fill("#email", "e2e-test@example.com");
		await page.fill("#phone", "+27 82 555 1234");

		// Click Cancel button
		await page.getByRole("button", { name: /cancel/i }).click();

		// Verify we navigated back (either to dashboard or previous page)
		await expect(page).not.toHaveURL(/\/dashboard\/applicants\/new/);
	});
});
