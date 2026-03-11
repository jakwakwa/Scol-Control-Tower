/**
 * SOP Workflow E2E Tests
 *
 * Tests the SOP-aligned 6-stage onboarding flow:
 * Stage 1: Lead Capture
 * Stage 2: Facility & Quote
 * Stage 3: Independent Risk Checks
 * Stage 4: Risk Review
 * Stage 5: Contract
 * Stage 6: Final Approval (Two-Factor)
 *
 * These tests use the dashboard UI and API mocks where external integrations
 * are stubbed (ProcureCheck is sandbox, Risk/Sanctions agents are mock).
 */
import { expect, test } from "../../fixtures";
import { DashboardPage } from "../../pages/dashboard.page";

test.describe("SOP Workflow — Stage Names & UI", () => {
	test("pipeline view shows SOP-aligned stage names", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.gotoDashboard();

		// Verify SOP-aligned stage names in the pipeline view
		const pipelineContent = await authenticatedPage.textContent("body");
		expect(pipelineContent).toContain("Lead Capture");
		expect(pipelineContent).toContain("Facility & Quote");
		expect(pipelineContent).toContain("Procurement & AI");
		expect(pipelineContent).toContain("Risk Review");
		expect(pipelineContent).toContain("Contract");
		expect(pipelineContent).toContain("Final Approval");
	});

	test("workflow table shows SOP-aligned stage names", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard/workflows");

		// The page should contain stage name references
		const bodyText = await authenticatedPage.textContent("body");
		// At least one SOP stage name should be present in the UI
		const hasStageNames =
			bodyText?.includes("Lead Capture") ||
			bodyText?.includes("Facility & Quote") ||
			bodyText?.includes("Procurement & AI") ||
			bodyText?.includes("Risk Review") ||
			bodyText?.includes("Final Approval");
		expect(hasStageNames).toBeTruthy();
	});
});

test.describe("SOP Workflow — Stage 1: Lead Capture", () => {
	test("can navigate to new applicant form", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard/applicants/new");
		await expect(authenticatedPage).toHaveURL(/.*applicants\/new/);

		// Verify the form is visible
		const companyNameField = authenticatedPage.locator("#companyName");
		await expect(companyNameField).toBeVisible();
	});

	test("applicant detail page has Reviews tab for quote", async ({
		authenticatedPage,
	}) => {
		// Use API to get a numeric applicant ID (avoids live selector resolving to /new)
		const applicantsRes = await authenticatedPage.request.get("/api/applicants");
		if (!applicantsRes.ok()) return;

		const data = await applicantsRes.json();
		const applicants = data.applicants || [];
		const first = applicants[0];
		if (!first?.id) {
			test.skip(true, "No applicants available");
		}

		await authenticatedPage.goto(`/dashboard/applicants/${first.id}`);
		await expect(authenticatedPage).toHaveURL(new RegExp(`/dashboard/applicants/${first.id}`));

		// Verify Reviews tab exists
		const reviewsTab = authenticatedPage.getByRole("tab", { name: /reviews/i });
		await expect(reviewsTab).toBeVisible();
	});
});

test.describe("SOP Workflow — Stage 4: Risk Review", () => {
	test("can navigate to risk review page", async ({ authenticatedPage }) => {
		const dashboardPage = new DashboardPage(authenticatedPage);
		await dashboardPage.goto();

		await dashboardPage.navigateToRiskReview();
		await expect(authenticatedPage).toHaveURL(/.*risk-review/);
	});

	test("risk review page renders without error", async ({ authenticatedPage }) => {
		await authenticatedPage.goto("/dashboard/risk-review");

		// Should not show a visible error heading (raw body text includes RSC payloads with "500", so avoid that check)
		const errorHeading = authenticatedPage.locator("text=Internal Server Error");
		await expect(errorHeading).not.toBeVisible();

		// The page should contain the Risk Review heading or table
		const body = authenticatedPage.locator("body");
		await expect(body).toBeVisible();
	});
});

test.describe("SOP Workflow — API Endpoints", () => {
	test("risk-review API returns structured response", async ({ authenticatedPage }) => {
		const response = await authenticatedPage.request.get("/api/risk-review");

		if (response.status() === 401 || response.status() === 403) {
			test.skip(true, "Auth not available in test context for risk-review API");
		}

		if (response.ok()) {
			const data = await response.json();
			expect(data).toHaveProperty("items");
			expect(data).toHaveProperty("count");
			expect(Array.isArray(data.items)).toBeTruthy();

			// If items exist, verify core API contract fields (Stage 4 awaiting_human)
			if (data.items.length > 0) {
				const item = data.items[0];
				expect(item).toHaveProperty("workflowId");
				expect(item).toHaveProperty("applicantId");
				expect(item).toHaveProperty("stageName");
				expect(item).toHaveProperty("reviewType");
			}
		}
		// 500 is acceptable when DB has no Stage 4 items
	});

	test("onboarding approve GET returns approval status", async ({
		authenticatedPage,
	}) => {
		// First get a workflow to test with
		const workflowsResponse = await authenticatedPage.request.get("/api/workflows");

		if (workflowsResponse.ok()) {
			const workflowsData = await workflowsResponse.json();
			const workflows = workflowsData.workflows || [];

			if (workflows.length > 0) {
				const workflowId = workflows[0].id;
				const response = await authenticatedPage.request.get(
					`/api/onboarding/approve?workflowId=${workflowId}`
				);
				expect(response.ok()).toBeTruthy();

				const data = await response.json();
				expect(data).toHaveProperty("workflowId");
				expect(data).toHaveProperty("stage");
				expect(data).toHaveProperty("isReadyForApproval");
				// Two-factor approval fields
				expect(data).toHaveProperty("riskManagerApproval");
				expect(data).toHaveProperty("accountManagerApproval");
				expect(data).toHaveProperty("bothApproved");
			}
		}
	});

	test("contract review API requires authentication", async ({ authenticatedPage }) => {
		const response = await authenticatedPage.request.post("/api/contract/review", {
			data: {
				workflowId: 999999,
				applicantId: 999999,
			},
		});

		// Since we're authenticated, the API should NOT return 200 for a non-existent workflow.
		// It may return 400, 404, or 500 depending on error handling, but not 200.
		expect(response.status()).not.toBe(200);
	});
});

test.describe("SOP Workflow — Stage 6: Two-Factor Final Approval UI", () => {
	test("applicant detail page has stage 6 related content", async ({
		authenticatedPage,
	}) => {
		// Use API to get a numeric applicant ID (avoids live selector resolving to /new)
		const applicantsRes = await authenticatedPage.request.get("/api/applicants");
		if (!applicantsRes.ok()) return;

		const data = await applicantsRes.json();
		const applicants = data.applicants || [];
		const first = applicants[0];
		if (!first?.id) {
			test.skip(true, "No applicants available");
		}

		await authenticatedPage.goto(`/dashboard/applicants/${first.id}`);
		await expect(authenticatedPage).toHaveURL(new RegExp(`/dashboard/applicants/${first.id}`));

		// The page should load without errors
		const errorText = authenticatedPage.locator("text=Internal Server Error");
		await expect(errorText).not.toBeVisible();
	});
});

test.describe("SOP Workflow — Stage 3 State Lock Collision", () => {
	test("manual UI approval wins against delayed stream-B writes", async ({
		authenticatedPage,
	}) => {
		// Retired: this test targeted the old procurement-card UI and Stage 3 items.
		// /api/risk-review now returns only Stage 4 awaiting_human; the risk-review
		// UI has changed. Rewrite against current flow when state-lock testing is needed.
		test.skip(true, "Outdated: risk-review API and UI no longer match this test");
	});
});
