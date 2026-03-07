/**
 * Dashboard Page Object
 *
 * Encapsulates dashboard page interactions for cleaner tests.
 */
import type { Locator, Page } from "@playwright/test";

export class DashboardPage {
	readonly page: Page;

	// Navigation elements
	readonly sidebar: Locator;
	readonly applicantsLink: Locator;
	readonly workflowsLink: Locator;
	readonly riskReviewLink: Locator;
	readonly notificationsLink: Locator;

	// Dashboard content
	readonly pipelineView: Locator;
	readonly applicantsTable: Locator;
	readonly statsCards: Locator;

	constructor(page: Page) {
		this.page = page;

		// Navigation
		this.sidebar = page.locator('[data-testid="sidebar"]');
		this.applicantsLink = page.locator('a[href="/dashboard/applicants"]');
		this.workflowsLink = page.locator('a[href*="/workflows"]');
		this.riskReviewLink = page.locator('a[href*="/risk-review"]');
		this.notificationsLink = page.locator('a[href*="/notifications"]');

		// Content
		this.pipelineView = page.locator('[data-testid="pipeline-view"]');
		this.applicantsTable = page.locator('[data-testid="applicants-table"]');
		this.statsCards = page.locator('[data-testid="stats-card"]');
	}

	async goto() {
		await this.page.goto("/dashboard");
	}

	async navigateToApplicants() {
		await this.applicantsLink.click();
		await this.page.waitForURL("**/applicants**");
	}

	async navigateToWorkflows() {
		await this.workflowsLink.click();
		await this.page.waitForURL("**/workflows**");
	}

	async navigateToRiskReview() {
		await this.riskReviewLink.click();
		await this.page.waitForURL("**/risk-review**");
	}

	async getApplicantCount(): Promise<number> {
		const countText = await this.page
			.locator('[data-testid="applicant-count"]')
			.textContent();
		return parseInt(countText || "0", 10);
	}
}
