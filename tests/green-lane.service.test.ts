import { beforeEach, describe, expect, it, mock } from "bun:test";
import { RISK_CHECK_TYPES } from "../db/schema";

const getRiskChecksForWorkflowMock = mock(async () => []);
const getHybridGateStatusMock = mock(async () => undefined);
const updateRiskCheckReviewStateMock = mock(async () => undefined);
const logWorkflowEventMock = mock(async () => undefined);

let applicantRiskLevel: string | null = "green";
let pendingUpdate: Record<string, unknown> = {};

const selectWhereMock = mock(async () => [{ riskLevel: applicantRiskLevel }]);
const updateWhereMock = mock(async () => {
	return [];
});

const fakeDatabaseClient = {
	select: () => ({
		from: () => ({
			where: selectWhereMock,
		}),
	}),
	update: () => ({
		set: (values: Record<string, unknown>) => {
			pendingUpdate = values;
			return {
				where: updateWhereMock,
			};
		},
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

mock.module("@/lib/services/notification-events.service", () => ({
	logWorkflowEvent: logWorkflowEventMock,
}));

const { isGreenLaneEligible, applyGreenLanePass } = await import("../lib/services/green-lane.service");

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

	it("returns eligible when extra check types exist beyond required (presence-only validation)", async () => {
		const requiredChecks = [
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
		];
		const extraCheck = {
			...createRiskCheck("PROCUREMENT", { anomalies: [] }),
			checkType: "CUSTOM" as const,
		};
		getRiskChecksForWorkflowMock.mockResolvedValue([...requiredChecks, extraCheck]);

		const result = await isGreenLaneEligible(100);

		expect(result.eligible).toBe(true);
		expect(result.reason).toBeUndefined();
	});
});

describe("applyGreenLanePass", () => {
	beforeEach(() => {
		pendingUpdate = {};
		updateRiskCheckReviewStateMock.mockClear();
		updateWhereMock.mockClear();
		logWorkflowEventMock.mockClear();
	});

	it("calls updateRiskCheckReviewState for each required check type", async () => {
		await applyGreenLanePass(100, { source: "manual_am" });

		expect(updateRiskCheckReviewStateMock).toHaveBeenCalledTimes(RISK_CHECK_TYPES.length);
		for (const checkType of RISK_CHECK_TYPES) {
			expect(updateRiskCheckReviewStateMock).toHaveBeenCalledWith(
				100,
				checkType,
				"approved",
				"system_green_lane",
				"Green Lane auto-approval"
			);
		}
	});

	it("persists greenLaneConsumedAt and greenLaneRequestSource", async () => {
		await applyGreenLanePass(100, { source: "automatic" });

		expect(updateWhereMock).toHaveBeenCalledTimes(1);
		expect(pendingUpdate.greenLaneConsumedAt).toBeInstanceOf(Date);
		expect(pendingUpdate.greenLaneRequestSource).toBe("automatic");
	});

	it("logs green_lane_approved with expected payload", async () => {
		const eligibilitySummary = { creditScore: 650, itcRiskCategory: "LOW" as const };
		await applyGreenLanePass(100, {
			source: "manual_am",
			checkSummary: "All checks passed",
			eligibilitySummary,
		});

		expect(logWorkflowEventMock).toHaveBeenCalledTimes(1);
		const call = logWorkflowEventMock.mock.calls[0];
		expect(call[0]).toMatchObject({
			workflowId: 100,
			eventType: "green_lane_approved",
			payload: {
				approvedBy: "system_green_lane",
				source: "manual_am",
				stage: 4,
				checkSummary: "All checks passed",
				eligibility: eligibilitySummary,
			},
			actorId: "system_green_lane",
		});
		expect(call[0].payload?.timestamp).toBeDefined();
	});
});
