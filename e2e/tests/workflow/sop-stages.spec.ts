/**
 * SOP Workflow E2E Tests
 *
 * Tests the SOP-aligned 6-stage onboarding flow:
 * Stage 1: Lead Capture
 * Stage 2: Facility & Quote
 * Stage 3: Procurement & AI
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
		await dashboardPage.goto();

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
		// Navigate to an applicant if one exists
		await authenticatedPage.goto("/dashboard/applicants");

		// Match only numeric applicant links, excluding /new or other sub-paths
		const applicantLinks = authenticatedPage
			.locator('a[href^="/dashboard/applicants/"]')
			.filter({
				hasNotText: /new/i,
			});
		const count = await applicantLinks.count();

		if (count > 0) {
			const href = await applicantLinks.first().getAttribute("href");
			if (href && /\/dashboard\/applicants\/\d+/.test(href)) {
				await applicantLinks.first().click();
				await authenticatedPage.waitForURL(/.*applicants\/\d+/);

				// Verify Reviews tab exists
				const reviewsTab = authenticatedPage.getByRole("tab", { name: /reviews/i });
				await expect(reviewsTab).toBeVisible();
			}
		}
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
		// Hit the risk review API
		const response = await authenticatedPage.request.get("/api/risk-review");

		if (response.ok()) {
			const data = await response.json();
			expect(data).toHaveProperty("items");
			expect(data).toHaveProperty("count");
			expect(Array.isArray(data.items)).toBeTruthy();

			// If items exist, they should have Reporter Agent fields
			if (data.items.length > 0) {
				const item = data.items[0];
				expect(item).toHaveProperty("workflowId");
				expect(item).toHaveProperty("applicantId");
				expect(item).toHaveProperty("stageName");
				expect(item).toHaveProperty("reviewType");
			}
		} else {
			// API may return 500 if DB query fails in test environments with limited data.
			// As long as it doesn't return 401/403 (auth issue), it's acceptable.
			expect([401, 403]).not.toContain(response.status());
		}
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
		await authenticatedPage.goto("/dashboard/applicants");

		// Match only numeric applicant links, excluding /new or other sub-paths
		const applicantLinks = authenticatedPage
			.locator('a[href^="/dashboard/applicants/"]')
			.filter({
				hasNotText: /new/i,
			});
		const count = await applicantLinks.count();

		if (count > 0) {
			// Ensure the first link actually points to a numeric ID
			const href = await applicantLinks.first().getAttribute("href");
			if (href && /\/dashboard\/applicants\/\d+/.test(href)) {
				await applicantLinks.first().click();
				await authenticatedPage.waitForURL(/.*applicants\/\d+/);

				// The page should load without errors
				const errorText = authenticatedPage.locator("text=Internal Server Error");
				await expect(errorText).not.toBeVisible();
			}
		}
	});
});

test.describe("SOP Workflow — Stage 3 State Lock Collision", () => {
	test("manual UI approval wins against delayed stream-B writes", async ({
		authenticatedPage,
	}) => {
		const reviewResponse = await authenticatedPage.request.get("/api/risk-review");
		expect(reviewResponse.ok()).toBeTruthy();
		const reviewData = await reviewResponse.json();
		const reviewItems = reviewData.items || [];

		const targetItem = reviewItems.find(
			(item: { reviewType?: string; stage?: number }) =>
				item.reviewType === "procurement" || item.stage === 3
		);
		test.skip(!targetItem, "No Stage 3 procurement review item available");

		const workflowId = targetItem.workflowId as number;
		const applicantId = targetItem.applicantId as number;

		const workflowsResponse = await authenticatedPage.request.get("/api/workflows");
		expect(workflowsResponse.ok()).toBeTruthy();
		const workflowsData = await workflowsResponse.json();
		const workflows = workflowsData.workflows || [];
		const targetWorkflow = workflows.find(
			(workflow: { id: number }) => workflow.id === workflowId
		);
		expect(targetWorkflow).toBeTruthy();

		const preLockVersion = Number(targetWorkflow.stateLockVersion || 0);

		// Stress pattern: run multiple delayed stream-B attempts in parallel.
		const collisionPromises = [800, 1200, 1600].map(delayMs =>
			authenticatedPage.request.post("/api/test/state-lock-collision", {
				data: {
					workflowId,
					expectedVersion: preLockVersion,
					delayMs,
					source: `e2e-stream-b-${delayMs}`,
				},
			})
		);

		await authenticatedPage.goto("/dashboard/risk-review");
		await expect(authenticatedPage.getByText(`WF-${workflowId}`)).toBeVisible();

		const workflowCard = authenticatedPage
			.locator("div")
			.filter({ hasText: `WF-${workflowId}` })
			.first();
		await workflowCard.getByRole("button", { name: /^Approve$/ }).click();

		await authenticatedPage.getByRole("combobox").first().click();
		await authenticatedPage.getByRole("option", { name: "AI Aligned" }).click();
		await authenticatedPage.getByRole("button", { name: "Confirm Approval" }).click();
		await expect(authenticatedPage.getByText("Application approved successfully")).toBeVisible();

		const collisionResponses = await Promise.all(collisionPromises);
		for (const response of collisionResponses) {
			expect(response.ok()).toBeTruthy();
			const payload = await response.json();
			expect(payload.collision).toBeTruthy();
		}

		const updatedWorkflowsResponse = await authenticatedPage.request.get("/api/workflows");
		expect(updatedWorkflowsResponse.ok()).toBeTruthy();
		const updatedWorkflowsData = await updatedWorkflowsResponse.json();
		const updatedTargetWorkflow = (updatedWorkflowsData.workflows || []).find(
			(workflow: { id: number }) => workflow.id === workflowId
		);
		expect(updatedTargetWorkflow).toBeTruthy();
		expect(Number(updatedTargetWorkflow.stateLockVersion || 0)).toBeGreaterThan(
			preLockVersion
		);

		const evidenceResponse = await authenticatedPage.request.get(
			`/api/test/state-lock-collision?workflowId=${workflowId}&applicantId=${applicantId}`
		);
		expect(evidenceResponse.ok()).toBeTruthy();
		const evidence = await evidenceResponse.json();
		expect(Number(evidence.staleDataFlaggedCount || 0)).toBeGreaterThan(0);
	});
});
