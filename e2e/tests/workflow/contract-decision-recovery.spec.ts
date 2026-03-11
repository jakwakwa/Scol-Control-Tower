import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "../../fixtures";

const INNGEST_BASE = process.env.INNGEST_BASE_URL || "http://localhost:9288";

type WorkflowSnapshot = {
	workflowId: number;
	applicantId: number;
	stage: number;
	status: string;
	quoteId: number | null;
};

async function getSnapshot(
	request: APIRequestContext,
	applicantId: number
): Promise<WorkflowSnapshot> {
	const response = await request.get(`/api/applicants/${applicantId}`);
	expect(response.ok()).toBeTruthy();
	const payload = await response.json();

	return {
		workflowId: payload.workflow?.id ?? 0,
		applicantId,
		stage: payload.workflow?.stage ?? 0,
		status: payload.workflow?.status ?? "",
		quoteId: payload.quote?.id ?? null,
	};
}

async function publishEvent(
	request: APIRequestContext,
	name: string,
	data: Record<string, unknown>
) {
	const response = await request.post(`${INNGEST_BASE}/e/test`, {
		data: { name, data },
	});
	expect(response.ok()).toBeTruthy();
}

test.describe("Workflow Recovery — Contract Decision", () => {
	test.describe.configure({ mode: "serial" });
	test.setTimeout(120_000);

	test("completes workflow after replaying wait-gate events", async ({
		authenticatedPage,
	}) => {
		test.skip(
			!process.env.RUN_SLOW_WORKFLOW_TEST,
			"Full workflow test is slow and flaky; set RUN_SLOW_WORKFLOW_TEST=1 to run"
		);

		const request = authenticatedPage.request;

		const inngestDevReady = await request.get(`${INNGEST_BASE}/v1/events`);
		test.skip(!inngestDevReady.ok(), `Inngest dev server is required at ${INNGEST_BASE}`);

		const uniqueSuffix = Date.now();
		const idNumber = String(uniqueSuffix).padStart(13, "1").slice(0, 13);

		const createApplicantResponse = await request.post("/api/applicants", {
			data: {
				companyName: `E2E Recovery ${uniqueSuffix}`,
				contactName: "E2E Runner",
				email: `e2e-recovery-${uniqueSuffix}@example.com`,
				phone: "+27110000000",
				idNumber,
				entityType: "proprietor",
				productType: "standard",
				industry: "IT",
				employeeCount: 1,
				estimatedTransactionsPerMonth: 10,
				notes: "E2E contract decision recovery flow",
			},
		});
		expect(createApplicantResponse.ok()).toBeTruthy();

		const createPayload = await createApplicantResponse.json();
		const applicantId = Number(createPayload.applicant.id);
		const workflowId = Number(createPayload.workflow.id);

		// Replay kickoff so we don't rely on API fire-and-forget timing
		await publishEvent(request, "onboarding/lead.created", {
			workflowId,
			applicantId,
		});

		const pollOpts = { timeout: 60_000, intervals: [1000, 2000, 5000] } as const;

		await expect
			.poll(
				async () => {
					const snap = await getSnapshot(request, applicantId);
					return `${snap.stage}:${snap.status}`;
				},
				pollOpts
			)
			.toBe("2:awaiting_human");

		await publishEvent(request, "form/facility.submitted", {
			workflowId,
			applicantId,
			submissionId: uniqueSuffix,
			formData: {
				mandateVolume: 15000000,
				mandateType: "DEBIT_ORDER",
				businessType: "PROPRIETOR",
			},
			submittedAt: new Date().toISOString(),
		});

		await expect
			.poll(
				async () => {
					const snap = await getSnapshot(request, applicantId);
					return snap.quoteId;
				},
				pollOpts
			)
			.not.toBeNull();
		const quoteId = (await getSnapshot(request, applicantId)).quoteId as number;

		await publishEvent(request, "quote/approved", {
			workflowId,
			applicantId,
			quoteId,
			approvedAt: new Date().toISOString(),
		});

		await publishEvent(request, "quote/responded", {
			workflowId,
			applicantId,
			quoteId,
			decision: "APPROVED",
			respondedAt: new Date().toISOString(),
		});

		await publishEvent(request, "upload/fica.received", {
			workflowId,
			applicantId,
			documents: [
				{
					type: "BANK_STATEMENT_3_MONTH",
					filename: "bank-statement.pdf",
					url: "https://example.com/bank-statement.pdf",
					uploadedAt: new Date().toISOString(),
				},
			],
			uploadedAt: new Date().toISOString(),
		});

		await expect
			.poll(
				async () => {
					const snap = await getSnapshot(request, applicantId);
					return `${snap.stage}:${snap.status}`;
				},
				pollOpts
			)
			.toBe("4:awaiting_human");

		await publishEvent(request, "risk/decision.received", {
			workflowId,
			applicantId,
			decision: {
				outcome: "APPROVED",
				reason: "E2E recovery approval",
				overrideCategory: "PROCESS_EXCEPTION",
			},
			audit: {
				humanActor: "e2e-tester",
				timestamp: new Date().toISOString(),
			},
		});

		await expect
			.poll(
				async () => {
					const snap = await getSnapshot(request, applicantId);
					return `${snap.stage}:${snap.status}`;
				},
				pollOpts
			)
			.toBe("5:awaiting_human");

		await publishEvent(request, "contract/draft.reviewed", {
			workflowId,
			applicantId,
			reviewedBy: "e2e-tester",
			reviewedAt: new Date().toISOString(),
		});

		await publishEvent(request, "form/absa-6995.completed", {
			workflowId,
			applicantId,
			completedAt: new Date().toISOString(),
		});

		await expect
			.poll(
				async () => {
					const snap = await getSnapshot(request, applicantId);
					return `${snap.stage}:${snap.status}`;
				},
				pollOpts
			)
			.toBe("6:awaiting_human");

		await publishEvent(request, "approval/risk-manager.received", {
			workflowId,
			applicantId,
			approvedBy: "e2e-tester",
			decision: "APPROVED",
			timestamp: new Date().toISOString(),
		});

		await publishEvent(request, "approval/account-manager.received", {
			workflowId,
			applicantId,
			approvedBy: "e2e-tester",
			decision: "APPROVED",
			timestamp: new Date().toISOString(),
		});

		await publishEvent(request, "form/decision.responded", {
			workflowId,
			applicantId,
			formType: "AGREEMENT_CONTRACT",
			decision: "APPROVED",
			respondedAt: new Date().toISOString(),
		});

		await expect
			.poll(
				async () => {
					const snap = await getSnapshot(request, applicantId);
					return `${snap.stage}:${snap.status}`;
				},
				pollOpts
			)
			.toBe("6:completed");
	});
});
