import { beforeEach, describe, expect, it, mock } from "bun:test";

const sendInternalAlertEmailMock = mock(async () => undefined);
const executeKillSwitchMock = mock(async () => undefined);
const createWorkflowNotificationMock = mock(async () => undefined);
const logWorkflowEventMock = mock(async () => undefined);
const getRiskChecksForWorkflowMock = mock(async () => []);
const getHybridGateStatusMock = mock(async () => ({
	allChecksTerminal: true,
	allChecksReviewed: false,
	ready: false,
	checks: [
		{ checkType: "PROCUREMENT", machineState: "completed", reviewState: "pending" },
		{ checkType: "ITC", machineState: "completed", reviewState: "pending" },
		{ checkType: "SANCTIONS", machineState: "completed", reviewState: "pending" },
		{ checkType: "FICA", machineState: "completed", reviewState: "pending" },
	],
}));
const updateRiskCheckReviewStateMock = mock(async () => undefined);
const updateWorkflowStatusMock = mock(async () => undefined);
const hasManualGreenLaneRequestMock = mock(async () => false);
const applyGreenLanePassMock = mock(async () => undefined);
const isGreenLaneEligibleMock = mock(async () => ({
	eligible: true,
	summary: {
		applicantRiskLevel: "green",
		creditScore: 760,
		itcRiskCategory: "LOW",
		procurementAnomalyCount: 0,
		itcAdverseListingCount: 0,
		sanctionsRiskLevel: "CLEAR",
		sanctionsBlocked: false,
		ficaOverallRecommendation: "PROCEED",
		ficaCriticalMismatchCount: 0,
	},
}));
const guardKillSwitchMock = mock(async () => undefined);
const notifyApplicantDeclineMock = mock(async () => undefined);

const fakeDatabaseClient = {
	select: () => ({
		from: () => ({
			where: async () => [{ riskLevel: "green" }],
		}),
	}),
};

mock.module("@/app/utils", () => ({
	getBaseUrl: () => "http://localhost:3000",
	getDatabaseClient: () => fakeDatabaseClient,
}));

mock.module("@/lib/constants/workflow-timeouts", () => ({
	WORKFLOW_TIMEOUTS: {
		STAGE: "7d",
	},
}));

mock.module("@/lib/services/email.service", () => ({
	sendInternalAlertEmail: sendInternalAlertEmailMock,
}));

mock.module("@/lib/services/green-lane.service", () => ({
	GREEN_LANE_APPROVED_BY: "system_green_lane",
	GREEN_LANE_REVIEW_NOTE: "Green Lane auto-approval",
	hasManualGreenLaneRequest: hasManualGreenLaneRequestMock,
	applyGreenLanePass: applyGreenLanePassMock,
	isGreenLaneEligible: isGreenLaneEligibleMock,
}));

mock.module("@/lib/services/kill-switch.service", () => ({
	executeKillSwitch: executeKillSwitchMock,
}));

mock.module("@/lib/services/notification-events.service", () => ({
	createWorkflowNotification: createWorkflowNotificationMock,
	logWorkflowEvent: logWorkflowEventMock,
}));

mock.module("@/lib/services/risk-check.service", () => ({
	getRiskChecksForWorkflow: getRiskChecksForWorkflowMock,
	getHybridGateStatus: getHybridGateStatusMock,
	updateRiskCheckReviewState: updateRiskCheckReviewStateMock,
}));

mock.module("@/lib/services/terminate-run.service", () => ({
	terminateRun: mock(async () => undefined),
}));

mock.module("@/lib/services/workflow.service", () => ({
	updateWorkflowStatus: updateWorkflowStatusMock,
}));

mock.module("../inngest/functions/control-tower/helpers", () => ({
	guardKillSwitch: guardKillSwitchMock,
	notifyApplicantDecline: notifyApplicantDeclineMock,
}));

const { executeStage4 } = await import(
	"../inngest/functions/control-tower/stages/stage4_guardKillSwitch"
);

function createStep(waitForEventResult?: unknown) {
	const runIds: string[] = [];
	const waitForEvent = mock(async () => waitForEventResult ?? null);

	return {
		runIds,
		waitForEvent,
		step: {
			run: async (id: string, handler: () => Promise<unknown> | unknown) => {
				runIds.push(id);
				return await handler();
			},
			waitForEvent,
		},
	};
}

describe("executeStage4 Green Lane", () => {
	beforeEach(() => {
		sendInternalAlertEmailMock.mockClear();
		executeKillSwitchMock.mockClear();
		createWorkflowNotificationMock.mockClear();
		logWorkflowEventMock.mockClear();
		getRiskChecksForWorkflowMock.mockClear();
		getHybridGateStatusMock.mockClear();
		updateRiskCheckReviewStateMock.mockClear();
		updateWorkflowStatusMock.mockClear();
		hasManualGreenLaneRequestMock.mockClear();
		applyGreenLanePassMock.mockClear();
		isGreenLaneEligibleMock.mockClear();
		guardKillSwitchMock.mockClear();
		notifyApplicantDeclineMock.mockClear();
	});

	it("bypasses manual Stage 4 review for Green Lane applicants", async () => {
		const { step, runIds, waitForEvent } = createStep();

		const result = await executeStage4({
			step: step as never,
			context: {
				workflowId: 10,
				applicantId: 20,
			},
		} as never);

		expect(result).toEqual({ status: "completed", stage: 4 });
		expect(waitForEvent).not.toHaveBeenCalled();
		expect(runIds).toContain("check-manual-green-lane");
		expect(runIds).toContain("check-green-lane-eligibility");
		expect(runIds).toContain("apply-automatic-green-lane-pass");
		expect(runIds).not.toContain("notify-final-review");
		expect(applyGreenLanePassMock).toHaveBeenCalledTimes(1);
	});

	it("continues with manual review when Green Lane eligibility fails", async () => {
		isGreenLaneEligibleMock.mockResolvedValueOnce({
			eligible: false,
			reason: "ITC credit score is below threshold",
			summary: {
				applicantRiskLevel: "green",
				creditScore: 420,
				itcRiskCategory: "HIGH",
				procurementAnomalyCount: 0,
				itcAdverseListingCount: 0,
				sanctionsRiskLevel: "CLEAR",
				sanctionsBlocked: false,
				ficaOverallRecommendation: "PROCEED",
				ficaCriticalMismatchCount: 0,
			},
		});

		const { step, runIds, waitForEvent } = createStep({
			data: {
				decision: {
					outcome: "APPROVED",
					decidedBy: "risk-manager",
				},
			},
		});

		const result = await executeStage4({
			step: step as never,
			context: {
				workflowId: 10,
				applicantId: 20,
			},
		} as never);

		expect(result).toEqual({ status: "completed", stage: 4 });
		expect(waitForEvent).toHaveBeenCalledTimes(1);
		expect(runIds).toContain("notify-final-review");
		expect(runIds).toContain("stage-4-awaiting-review");
		expect(updateRiskCheckReviewStateMock).not.toHaveBeenCalled();
	});

	it("applies manual Green Lane when request already exists and skips review wait", async () => {
		hasManualGreenLaneRequestMock.mockResolvedValueOnce(true);

		const { step, runIds, waitForEvent } = createStep();

		const result = await executeStage4({
			step: step as never,
			context: {
				workflowId: 10,
				applicantId: 20,
			},
		} as never);

		expect(result).toEqual({ status: "completed", stage: 4 });
		expect(waitForEvent).not.toHaveBeenCalled();
		expect(runIds).toContain("apply-manual-green-lane-pass");
		expect(runIds).not.toContain("check-green-lane-eligibility");
		expect(runIds).not.toContain("notify-final-review");
		expect(applyGreenLanePassMock).toHaveBeenCalledWith(10, {
			source: "manual_am",
			checkSummary:
				"PROCUREMENT: completed, ITC: completed, SANCTIONS: completed, FICA: completed",
		});
	});

	it("consumes manual Green Lane grant received while awaiting review", async () => {
		isGreenLaneEligibleMock.mockResolvedValueOnce({
			eligible: false,
			reason: "ITC credit score is below threshold",
			summary: {
				applicantRiskLevel: "green",
				creditScore: 420,
				itcRiskCategory: "HIGH",
				procurementAnomalyCount: 0,
				itcAdverseListingCount: 0,
				sanctionsRiskLevel: "CLEAR",
				sanctionsBlocked: false,
				ficaOverallRecommendation: "PROCEED",
				ficaCriticalMismatchCount: 0,
			},
		});

		const { step, runIds, waitForEvent } = createStep({
			data: {
				decision: {
					outcome: "APPROVED",
					decidedBy: "risk-manager",
					source: "manual_green_lane",
				},
			},
		});

		const result = await executeStage4({
			step: step as never,
			context: {
				workflowId: 10,
				applicantId: 20,
			},
		} as never);

		expect(result).toEqual({ status: "completed", stage: 4 });
		expect(waitForEvent).toHaveBeenCalledTimes(1);
		expect(runIds).toContain("notify-final-review");
		expect(runIds).toContain("stage-4-awaiting-review");
		expect(runIds).toContain("apply-manual-green-lane-pass-from-event");
		expect(applyGreenLanePassMock).toHaveBeenCalledWith(10, {
			source: "manual_am",
			checkSummary: "Manual Green Lane granted while awaiting review",
		});
	});
});
