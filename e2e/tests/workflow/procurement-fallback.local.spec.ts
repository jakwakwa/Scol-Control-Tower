import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { request as playwrightRequest } from "@playwright/test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../../../db/schema";
import { expect, test } from "../../fixtures";

const LOCAL_E2E_DB_PATH = resolve(process.cwd(), "e2e/test.db");
const LOCAL_E2E_DB_URL = `file:${LOCAL_E2E_DB_PATH}`;
const LOCAL_DB_HINT = "e2e/test.db";

async function createClerkSessionToken(): Promise<string> {
	const clerkSecretKey = process.env.CLERK_SECRET_KEY;
	if (!clerkSecretKey) {
		throw new Error("Missing CLERK_SECRET_KEY for local Playwright auth");
	}

	const headers = {
		Authorization: `Bearer ${clerkSecretKey}`,
		"Content-Type": "application/json",
	};

	const usersResponse = await fetch("https://api.clerk.com/v1/users?limit=1", {
		headers,
	});
	if (!usersResponse.ok) {
		throw new Error(`Failed to load Clerk users: ${usersResponse.status}`);
	}
	const users = (await usersResponse.json()) as Array<{ id?: string }>;
	const userId = users[0]?.id;
	if (!userId) {
		throw new Error("No Clerk users available for local test auth");
	}

	const sessionResponse = await fetch("https://api.clerk.com/v1/sessions", {
		method: "POST",
		headers,
		body: JSON.stringify({ user_id: userId }),
	});
	if (!sessionResponse.ok) {
		throw new Error(`Failed to create Clerk session: ${sessionResponse.status}`);
	}
	const session = (await sessionResponse.json()) as { id?: string };
	if (!session.id) {
		throw new Error("Clerk session response missing id");
	}

	const tokenResponse = await fetch(
		`https://api.clerk.com/v1/sessions/${session.id}/tokens`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({}),
		}
	);
	if (!tokenResponse.ok) {
		throw new Error(`Failed to create Clerk token: ${tokenResponse.status}`);
	}
	const token = (await tokenResponse.json()) as { jwt?: string };
	if (!token.jwt) {
		throw new Error("Clerk token response missing jwt");
	}
	return token.jwt;
}

async function seedProcurementFallbackScenario(): Promise<void> {
	const client = createClient({ url: LOCAL_E2E_DB_URL });
	const db = drizzle(client, { schema });

	const workflowId = 1;
	const applicantId = 1;

	await db
		.update(schema.workflows)
		.set({ stage: 3, status: "awaiting_human" })
		.where(eq(schema.workflows.id, workflowId));

	await db.insert(schema.riskAssessments).values({
		applicantId,
		overallRisk: "amber",
		aiAnalysis: JSON.stringify({
			scores: { aggregatedScore: 74 },
			recommendation: "MANUAL_REVIEW",
			flags: ["Document verification completed", "Moderate cashflow variance"],
			sanctionsLevel: "clear",
			validationSummary: { status: "complete" },
			riskDetails: { status: "complete" },
			dataSource: "mock",
		}),
		reviewedBy: "local-test",
	});

	await db.insert(schema.workflowEvents).values({
		workflowId,
		eventType: "error",
		payload: JSON.stringify({
			error: "ProcureCheck timeout from sandbox",
			context: "procurement_check_failed",
			source: "procurecheck",
			stage: 3,
			manualReviewRequired: true,
			fallbackMode: "manual_human_procurement_check",
			failedAreas: [
				"Automated procurement vendor screening",
				"Automated procurement risk scoring",
			],
			guidance:
				"Automated ProcureCheck could not run. Risk Manager must perform a full manual procurement check.",
		}),
		actorType: "platform",
		actorId: "local_test_seed",
	});

	await db.insert(schema.notifications).values({
		workflowId,
		applicantId,
		type: "error",
		message:
			"Manual Procurement Check Required: Automated ProcureCheck failed to execute. Continue reviewing available Stage 3 outputs and complete a full manual procurement check.",
		actionable: true,
		read: false,
	});

	client.close();
}

test.describe("Procurement fallback local regression", () => {
	test.skip(
		!process.env.DATABASE_URL?.includes(LOCAL_DB_HINT),
		"Requires local e2e DB. Set DATABASE_URL to a local file under e2e/test.db."
	);

	test("shows manual-check fallback across API and dashboard surfaces", async ({
		page,
		resetDatabase,
		baseURL,
	}) => {
		await resetDatabase();
		await seedProcurementFallbackScenario();

		const token = await createClerkSessionToken();
		await page.context().setExtraHTTPHeaders({ Authorization: `Bearer ${token}` });

		const authedRequest = await playwrightRequest.newContext({
			baseURL,
			extraHTTPHeaders: { Authorization: `Bearer ${token}` },
		});

		const apiResponse = await authedRequest.get("/api/risk-review");
		expect(apiResponse.status()).toBe(200);
		const apiPayload = (await apiResponse.json()) as {
			items?: Array<Record<string, unknown>>;
		};
		const workflowItem = (apiPayload.items || []).find(
			item => Number(item.workflowId) === 1
		) as Record<string, unknown> | undefined;
		expect(workflowItem).toBeTruthy();
		expect(workflowItem?.procurementCheckFailed).toBe(true);
		expect(String(workflowItem?.procurementFailureReason || "")).toContain(
			"ProcureCheck"
		);
		expect(String(workflowItem?.procurementFailureGuidance || "")).toContain(
			"manual procurement check"
		);
		expect(workflowItem?.aiTrustScore).toBe(74);

		await page.goto("/dashboard/risk-review", { waitUntil: "networkidle" });
		await expect(
			page.locator("text=MANUAL PROCUREMENT CHECK REQUIRED").first()
		).toBeVisible();
		await expect(
			page.locator("text=Failure: ProcureCheck timeout from sandbox").first()
		).toBeVisible();

		await page.goto("/dashboard/notifications", { waitUntil: "networkidle" });
		await expect(page.locator("text=Manual Check").first()).toBeVisible();
		await expect(
			page.locator("text=Automated procurement checks failed").first()
		).toBeVisible();

		await page.goto("/dashboard/workflows/1", { waitUntil: "networkidle" });
		await expect(
			page.locator("text=Procurement Automation Failed").first()
		).toBeVisible();
		await expect(
			page.locator("text=Automated procurement checks did not run").first()
		).toBeVisible();

		await authedRequest.dispose();
	});
});
