import { beforeEach, describe, expect, it, mock } from "bun:test";

const getRiskChecksForWorkflowMock = mock(async () => []);
const getHybridGateStatusMock = mock(async () => undefined);
const updateRiskCheckReviewStateMock = mock(async () => undefined);

let applicantRiskLevel: string | null = "green";

const selectWhereMock = mock(async () => [{ riskLevel: applicantRiskLevel }]);

const fakeDatabaseClient = {
	select: () => ({
		from: () => ({
			where: selectWhereMock,
		}),
	}),
};

mock.module("@/app/utils", () => ({
	getBaseUrl: () => "http://localhost:3000",
	getDatabaseClient: () => fakeDatabaseClient,
}));

mock.module("@/lib/services/risk-check.service", () => ({
	getRiskChecksForWorkflow: getRiskChecksForWorkflowMock,
	getHybridGateStatus: getHybridGateStatusMock,
	updateRiskCheckReviewState: updateRiskCheckReviewStateMock,
}));

const { isGreenLaneEligible } = await import("../lib/services/green-lane.service");

function createRiskCheck(
	checkType: "PROCUREMENT" | "ITC" | "SANCTIONS" | "FICA",
	payload: unknown,
	overrides?: Partial<{
		machineState: string;
		rawPayload: unknown;
	}>
) {
	return {
		id: 1,
		workflowId: 100,
		applicantId: 200,
		checkType,
		machineState: overrides?.machineState ?? "completed",
		reviewState: "pending",
		provider: null,
		externalCheckId: null,
		payload: JSON.stringify(payload),
		rawPayload:
			overrides?.rawPayload === undefined ? null : JSON.stringify(overrides.rawPayload),
		errorDetails: null,
		startedAt: null,
		completedAt: null,
		reviewedBy: null,
		reviewedAt: null,
		reviewNotes: null,
		createdAt: null,
		updatedAt: null,
	};
}

describe("isGreenLaneEligible", () => {
	beforeEach(() => {
		applicantRiskLevel = "green";
		selectWhereMock.mockClear();
		getRiskChecksForWorkflowMock.mockReset();
	});

	it("returns eligible for applicants with clean, completed checks", async () => {
		getRiskChecksForWorkflowMock.mockResolvedValue([
			createRiskCheck("PROCUREMENT", { anomalies: [], recommendedAction: "APPROVE" }),
			createRiskCheck("ITC", {
				creditScore: 650,
				riskCategory: "LOW",
				adverseListings: [],
				passed: true,
			}),
			createRiskCheck("SANCTIONS", {
				isBlocked: false,
				riskLevel: "CLEAR",
				passed: true,
			}),
			createRiskCheck("FICA", {
				summary: {
					overallRecommendation: "PROCEED",
					criticalMismatchCount: 0,
				},
				ficaComparisons: [],
			}),
		]);

		const result = await isGreenLaneEligible(100);

		expect(result.eligible).toBe(true);
		expect(result.reason).toBeUndefined();
		expect(result.summary.creditScore).toBe(650);
		expect(result.summary.itcRiskCategory).toBe("LOW");
	});

	it("uses ITC raw payload when the simplified payload omits flags", async () => {
		getRiskChecksForWorkflowMock.mockResolvedValue([
			createRiskCheck("PROCUREMENT", { anomalies: [] }),
			createRiskCheck(
				"ITC",
				{
					creditScore: 760,
					passed: true,
				},
				{
					rawPayload: {
						creditProfile: {
							riskCategory: "Low",
						},
						adverseListings: [],
					},
				}
			),
			createRiskCheck("SANCTIONS", {
				isBlocked: false,
				riskLevel: "LOW",
				passed: true,
			}),
			createRiskCheck("FICA", {
				summary: {
					overallRecommendation: "PROCEED",
					criticalMismatchCount: 0,
				},
			}),
		]);

		const result = await isGreenLaneEligible(100);

		expect(result.eligible).toBe(true);
		expect(result.summary.itcRiskCategory).toBe("LOW");
		expect(result.summary.itcAdverseListingCount).toBe(0);
	});

	it("returns ineligible when any risk check is not completed", async () => {
		getRiskChecksForWorkflowMock.mockResolvedValue([
			createRiskCheck("PROCUREMENT", { anomalies: [] }),
			createRiskCheck("ITC", {
				creditScore: 650,
				riskCategory: "LOW",
				adverseListings: [],
				passed: true,
			}),
			createRiskCheck(
				"SANCTIONS",
				{
					isBlocked: false,
					riskLevel: "CLEAR",
					passed: true,
				},
				{ machineState: "manual_required" }
			),
			createRiskCheck("FICA", {
				summary: {
					overallRecommendation: "PROCEED",
					criticalMismatchCount: 0,
				},
			}),
		]);

		const result = await isGreenLaneEligible(100);

		expect(result.eligible).toBe(false);
		expect(result.reason).toBe("SANCTIONS risk check is not completed");
	});

	it("returns ineligible for high-risk applicants", async () => {
		applicantRiskLevel = "red";
		getRiskChecksForWorkflowMock.mockResolvedValue([
			createRiskCheck("PROCUREMENT", { anomalies: [] }),
			createRiskCheck("ITC", {
				creditScore: 650,
				riskCategory: "LOW",
				adverseListings: [],
				passed: true,
			}),
			createRiskCheck("SANCTIONS", {
				isBlocked: false,
				riskLevel: "CLEAR",
				passed: true,
			}),
			createRiskCheck("FICA", {
				summary: {
					overallRecommendation: "PROCEED",
					criticalMismatchCount: 0,
				},
			}),
		]);

		const result = await isGreenLaneEligible(100);

		expect(result.eligible).toBe(false);
		expect(result.reason).toBe("Applicant is high risk");
	});

	it("returns ineligible when ITC evidence is incomplete", async () => {
		getRiskChecksForWorkflowMock.mockResolvedValue([
			createRiskCheck("PROCUREMENT", { anomalies: [] }),
			createRiskCheck("ITC", {
				creditScore: 760,
				passed: true,
			}),
			createRiskCheck("SANCTIONS", {
				isBlocked: false,
				riskLevel: "CLEAR",
				passed: true,
			}),
			createRiskCheck("FICA", {
				summary: {
					overallRecommendation: "PROCEED",
					criticalMismatchCount: 0,
				},
			}),
		]);

		const result = await isGreenLaneEligible(100);

		expect(result.eligible).toBe(false);
		expect(result.reason).toBe("ITC adverse listing evidence is incomplete");
		expect(result.summary.itcAdverseListingCount).toBeNull();
	});
});
